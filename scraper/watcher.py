import os
import requests
from bs4 import BeautifulSoup
import json
import re
from supabase import create_client, Client

def main():
    print("--- Step 1: ExeLodge Watcher Starting Intensive Debug ---")
    
    # --- CLOUD CONFIGURATION ---
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        print("[Watcher] Connection info missing. Exiting.")
        return

    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("Step 2: Supabase client initialized.")
    except Exception as e:
        print(f"Step 2 Failed: {e}")
        return

    # TASK 1: Clean up existing 0-price data
    print("Step 3: Cleaning up invalid data (price = 0)...")
    try:
        cleanup = supabase.table("properties").delete().eq("price_pppw", 0).execute()
        print(f"Step 3 Success: Cleaned up invalid rows.")
    except Exception as e:
        print(f"Step 3 Warning: Cleanup failed: {e}")

    # Ensure hardcoded landlord 'general' exists
    TEST_LANDLORD_ID = 'general'
    try:
        supabase.table("landlords").upsert({
            "id": TEST_LANDLORD_ID,
            "name": "General Landlord",
            "type": "Scraped Source"
        }).execute()
    except:
        pass

    # --- SCRAPING LOGIC ---
    URL = "https://www.unihomes.co.uk/student-accommodation/exeter"
    print(f"Step 4: Fetching UniHomes Exeter...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }
    
    try:
        response = requests.get(URL, headers=headers, timeout=20)
        print(f"Step 4 Info: Status {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        listings = []

        # Find potential property cards
        cards = soup.find_all(['div', 'article', 'section'], class_=lambda x: x and ('property' in x.lower() or 'card' in x.lower() or 'listing' in x.lower()))
        print(f"Step 5: Found {len(cards)} potential property elements.")

        for card in cards:
            try:
                # 1. More aggressive address detection
                addr_elem = card.find(['h2', 'h3', 'h4', 'strong', 'p'], class_=lambda x: x and ('address' in x.lower() or 'title' in x.lower()))
                if not addr_elem:
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                
                if not addr_elem: continue
                address = addr_elem.text.strip()
                if len(address) < 5: continue # Ignore noise
                
                # 2. INTENSE PRICE DETECTION (Regex & Alternative selectors)
                price = 0
                price_text = card.get_text(separator=' ')
                
                # Look for patterns like £150, 150pw, 150 pppw
                price_matches = re.findall(r'£\s?(\d{2,3})', price_text)
                if not price_matches:
                    # Try without the £ symbol if common
                    price_matches = re.findall(r'(\d{2,3})\s?pppw', price_text.lower())
                
                if price_matches:
                    # Take the first plausible student price (usually between 80 and 300)
                    for match in price_matches:
                        val = int(match)
                        if 70 < val < 500:
                            price = val
                            break

                # 3. QUALITY CHECK: Minimum Price
                if price < 70: 
                    print(f"[Watcher] Skipping '{address}' due to invalid price ({price}).")
                    continue

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
        
        print(f"Step 6: Extracted {len(listings)} VALID listings.")

        # --- DATABASE PUSH ---
        if listings:
            success_count = 0
            for listing in listings:
                try:
                    supabase.table("properties").upsert({
                        "id": listing["id"],
                        "address": listing["address"],
                        "price_pppw": listing["price_pppw"],
                        "bills_included": listing["bills_included"],
                        "area": listing["area"],
                        "landlord_id": TEST_LANDLORD_ID,
                        "notes": f"Verified Scrape from {listing['source']}"
                    }).execute()
                    success_count += 1
                except Exception as e:
                    print(f"Step 7 Error for {listing['address']}: {e}")
            
            print(f"--- Step 8: Successfully pushed {success_count}/{len(listings)} listings. ---")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    main()
