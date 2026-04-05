import os
import requests
from bs4 import BeautifulSoup
import json
import re
from supabase import create_client, Client

def main():
    print("--- Step 1: ExeLodge Watcher Starting Deep Debug ---")
    
    # --- CLOUD CONFIGURATION ---
    print("Step 2: Checking environment variables...")
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
        print("[Watcher] Variables detected!")
    else:
        if not SUPABASE_URL:
            print("[Watcher] CRITICAL: SUPABASE_URL is missing.")
        if not SUPABASE_SERVICE_ROLE_KEY:
            print("[Watcher] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing.")

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("[Watcher] Step 2 Failed: Connection info missing. Exiting.")
        return

    print(f"Step 3: Connecting to Supabase at {SUPABASE_URL}...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("Step 3 Success: Supabase client initialized.")
    except Exception as e:
        print(f"Step 3 Failed: Client initialization error: {e}")
        return

    # Hardcoding landlord_id to 'general' for this test run as per instructions
    TEST_LANDLORD_ID = 'general'
    print(f"Step 4: Ensuring hardcoded landlord '{TEST_LANDLORD_ID}' exists...")
    try:
        supabase.table("landlords").upsert({
            "id": TEST_LANDLORD_ID,
            "name": "General Landlord",
            "type": "Scraped Source"
        }).execute()
        print(f"Step 4 Success: Landlord '{TEST_LANDLORD_ID}' is ready.")
    except Exception as e:
        print(f"Step 4 Warning: Could not ensure landlord exists: {e}")

    # --- SCRAPING LOGIC ---
    URL = "https://www.unihomes.co.uk/student-accommodation/exeter"
    print(f"Step 5: Fetching UniHomes Exeter from {URL}...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
    }
    
    try:
        response = requests.get(URL, headers=headers, timeout=20)
        print(f"Step 5 Info: Status Code: {response.status_code}")
        print(f"Step 5 Info: HTML Snippet (first 50 chars): {response.text[:50]}")
        
        if "captcha" in response.text.lower() or "blocked" in response.text.lower():
            print("Step 5 WARNING: Bot detection screen detected in HTML!")

        soup = BeautifulSoup(response.text, 'html.parser')
        listings = []

        # Find anything that looks like a property
        cards = soup.find_all(['div', 'article'], class_=lambda x: x and ('property' in x.lower() or 'card' in x.lower()))
        print(f"Step 6: Parsing HTML. Found {len(cards)} potential property cards.")

        if not cards:
            print("Step 6 Info: No standard cards found. Trying link-based fallback...")
            links = soup.find_all('a', href=lambda x: x and '/student-accommodation/' in x)
            unique_links = list(set([l['href'] for l in links if l['href'].count('/') >= 4]))
            print(f"Step 6 Info: Found {len(unique_links)} property links in fallback mode.")
            for link in unique_links:
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
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                    if not addr_elem: continue
                    address = addr_elem.text.strip()
                    
                    price_text = card.get_text()
                    price = 0
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
                except:
                    continue
        
        print(f"Step 7: Extracted {len(listings)} clean listings.")

        # --- DATABASE PUSH ---
        if listings:
            print(f"Step 8: Pushing {len(listings)} listings to Supabase table 'properties'...")
            success_count = 0
            for listing in listings:
                try:
                    # STRICT TRY/EXCEPT FOR UPSERT
                    result = supabase.table("properties").upsert({
                        "id": listing["id"],
                        "address": listing["address"],
                        "price_pppw": listing["price_pppw"],
                        "bills_included": listing["bills_included"],
                        "area": listing["area"],
                        "landlord_id": TEST_LANDLORD_ID, # HARDCODED TO 'general'
                        "notes": f"Deep Debug Scrape from {listing['source']}"
                    }).execute()
                    success_count += 1
                except Exception as db_err:
                    print(f"Step 8 FAILED for {listing['address']}:")
                    print(f"EXACT ERROR: {db_err}")
            
            print(f"--- Step 9: Process Complete. Successfully pushed {success_count}/{len(listings)} listings. ---")
        else:
            print("Step 8: No listings found to push. Check selectors in Step 6.")

    except Exception as e:
        print(f"CRITICAL ERROR in main loop: {e}")

if __name__ == "__main__":
    main()
