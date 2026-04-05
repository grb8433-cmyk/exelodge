import os
import requests
from bs4 import BeautifulSoup
import json
from supabase import create_client, Client

# --- CLOUD CONFIGURATION ---
# These are passed from GitHub Actions Secrets or local .env
# We use os.environ.get to ensure we can pull from the GitHub Action 'env' section
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[Watcher] CRITICAL: Supabase environment variables missing.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# The list of target URLs for the daily scan
TARGETS = [
    {"name": "UniHomes", "url": "https://www.unihomes.co.uk/student-accommodation/exeter"},
]

def ensure_general_landlord():
    """Ensure a General Landlord exists in the database for linking."""
    if not supabase:
        return None
    
    landlord_id = "general-landlord"
    try:
        # Check if exists
        response = supabase.table("landlords").select("*").eq("id", landlord_id).execute()
        if not response.data:
            print("[Watcher] Creating General Landlord entry...")
            supabase.table("landlords").insert({
                "id": landlord_id,
                "name": "General Landlord",
                "type": "Scraped Source"
            }).execute()
        return landlord_id
    except Exception as e:
        print(f"[Watcher] Error ensuring General Landlord: {e}")
        return None

def crawl_unihomes():
    print("[Watcher] Crawling UniHomes Exeter...")
    # Strict User-Agent to prevent bot blocking
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
    }
    
    try:
        response = requests.get(TARGETS[0]['url'], headers=headers, timeout=20)
        print(f"[Watcher] Response status: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        listings = []

        # UniHomes uses different classes. Let's look for anything that looks like a property listing.
        # Based on current structure, they often use 'article' or specific data attributes.
        cards = soup.find_all(['div', 'article'], class_=lambda x: x and ('property' in x.lower() or 'card' in x.lower()))
        
        # If no specific cards found, try finding links with 'student-accommodation'
        if not cards:
            print("[Watcher] No cards found with standard selectors, trying link-based search...")
            links = soup.find_all('a', href=lambda x: x and '/student-accommodation/' in x)
            # Filter for unique links that seem to be properties
            unique_links = list(set([l['href'] for l in links if l['href'].count('/') >= 4]))
            for link in unique_links:
                # Mock data for link-based discovery if we can't parse full cards
                address = link.split('/')[-1].replace('-', ' ').title()
                listings.append({
                    "id": f"scraped-{hash(address)}",
                    "address": address,
                    "price_pppw": 0,
                    "source": "UniHomes",
                    "area": "Exeter",
                    "bills_included": True
                })
        else:
            for card in cards:
                try:
                    # Look for address in h2, h3 or strong
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                    if not addr_elem: continue
                    address = addr_elem.text.strip()
                    
                    # Look for price
                    price_text = card.get_text()
                    price = 0
                    if '£' in price_text:
                        import re
                        match = re.search(r'£(\d+)', price_text)
                        if match:
                            price = int(match.group(1))

                    listings.append({
                        "id": f"scraped-{hash(address)}",
                        "address": address,
                        "price_pppw": price,
                        "source": "UniHomes",
                        "area": "Exeter",
                        "bills_included": "bills" in price_text.lower()
                    })
                except Exception as e:
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
        landlord_id = ensure_general_landlord()
        print(f"[Watcher] Pushing {len(all_new_listings)} listings to Supabase Cloud...")
        
        success_count = 0
        for listing in all_new_listings:
            try:
                supabase.table("properties").upsert({
                    "id": listing["id"],
                    "address": listing["address"],
                    "price_pppw": listing["price_pppw"],
                    "bills_included": listing["bills_included"],
                    "area": listing["area"],
                    "landlord_id": landlord_id,
                    "notes": f"Scraped from {listing['source']}"
                }).execute()
                success_count += 1
            except Exception as e:
                print(f"[Watcher] Supabase insert error for {listing['address']}: {e}")
        
        print(f"[Watcher] Successfully pushed {success_count} listings.")
    else:
        print("[Watcher] Skipping Supabase push (no key or no data).")
        if all_new_listings:
            with open("scraper_results.json", "w") as f:
                json.dump(all_new_listings, f, indent=4)

    print("--- Watcher Finished ---")

if __name__ == "__main__":
    main()
