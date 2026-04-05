import os
import requests
from bs4 import BeautifulSoup
import json
from supabase import create_client, Client

# --- CLOUD CONFIGURATION ---
# These are passed from GitHub Actions Secrets or local .env
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[Watcher] CRITICAL: Supabase environment variables missing.")
    # Fallback for local testing if needed, but in CI we want it to fail
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# The list of target URLs for the daily scan
TARGETS = [
    {"name": "UniHomes", "url": "https://www.unihomes.co.uk/student-accommodation/exeter"},
    {"name": "Rightmove", "url": "https://www.rightmove.co.uk/student-accommodation/Exeter.html"},
    {"name": "Student Cribs", "url": "https://student-cribs.com/locations/exeter/"},
]

def crawl_unihomes():
    print("[Watcher] Crawling UniHomes Exeter...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    try:
        response = requests.get(TARGETS[0]['url'], headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        listings = []
        # Update these selectors based on the current UniHomes structure
        cards = soup.select('.property-card') 
        for card in cards:
            try:
                address = card.select_one('h2').text.strip() if card.select_one('h2') else "Unknown Address"
                price_text = card.select_one('.price').text.strip() if card.select_one('.price') else "0"
                # Clean price string (e.g., "£150pppw" -> 150)
                price = int(''.join(filter(str.isdigit, price_text))) if any(c.isdigit() for c in price_text) else 0
                
                listings.append({
                    "id": f"scraped-{hash(address)}", # Simple ID generation
                    "address": address,
                    "price_pppw": price,
                    "source": "UniHomes",
                    "area": "Exeter", # Default for now
                    "bills_included": True if "bills" in price_text.lower() else False
                })
            except Exception as e:
                print(f"[Watcher] Error parsing card: {e}")
                continue
        return listings
    except Exception as e:
        print(f"[Watcher] Error on UniHomes: {e}")
        return []

def main():
    print("--- ExeLodge Watcher Starting ---")
    
    # 1. Scrape all sources
    all_new_listings = []
    all_new_listings += crawl_unihomes()
    
    print(f"[Watcher] Found {len(all_new_listings)} total listings.")
    
    # 2. Push to Supabase
    if supabase and all_new_listings:
        print(f"[Watcher] Pushing {len(all_new_listings)} listings to Supabase Cloud...")
        for listing in all_new_listings:
            try:
                # Using upsert to prevent duplicates based on ID
                data, count = supabase.table("properties").upsert({
                    "id": listing["id"],
                    "address": listing["address"],
                    "price_pppw": listing["price_pppw"],
                    "bills_included": listing["bills_included"],
                    "area": listing["area"],
                    "notes": f"Scraped from {listing['source']}"
                }).execute()
                print(f"[Watcher] Successfully upserted: {listing['address']}")
            except Exception as e:
                print(f"[Watcher] Supabase insert error for {listing['address']}: {e}")
    else:
        print("[Watcher] Skipping Supabase push (no key or no data).")
        with open("scraper_results.json", "w") as f:
            json.dump(all_new_listings, f, indent=4)

    print("--- Watcher Finished ---")

if __name__ == "__main__":
    main()
