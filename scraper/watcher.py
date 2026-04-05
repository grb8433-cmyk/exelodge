import os
import requests
from bs4 import BeautifulSoup
import json
import re
import time
from supabase import create_client, Client

def main():
    print("--- Step 1: ExeLodge Watcher Starting High-Quality Scrape ---")
    
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

    # TASK: Cleanup - Remove all existing properties to start fresh
    print("Step 3: Cleaning up all existing property data for fresh start...")
    try:
        # Delete properties where ID is not null (effectively all)
        supabase.table("properties").delete().neq("id", "0").execute()
        print(f"Step 3 Success: Database cleared.")
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

    # --- SCRAPING LOGIC WITH PAGINATION ---
    BASE_URL = "https://www.unihomes.co.uk/student-accommodation/exeter"
    all_listings = []
    page = 1
    max_pages = 10 # Attempt to get 100+ properties

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }

    print(f"Step 4: Starting Multi-Page Scrape (Target: {max_pages} pages)...")

    while page <= max_pages:
        url = f"{BASE_URL}?page={page}" if page > 1 else BASE_URL
        print(f"[Watcher] Fetching Page {page}: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code != 200:
                print(f"[Watcher] Page {page} returned status {response.status_code}. Stopping pagination.")
                break
            
            soup = BeautifulSoup(response.text, 'html.parser')
            # Look for property cards/containers
            cards = soup.find_all(['div', 'article', 'section'], class_=lambda x: x and ('property' in x.lower() or 'card' in x.lower() or 'listing' in x.lower()))
            
            if not cards:
                print(f"[Watcher] No more properties found on page {page}. Stopping.")
                break

            page_found_count = 0
            for card in cards:
                try:
                    # 1. Address detection
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong', 'p'], class_=lambda x: x and ('address' in x.lower() or 'title' in x.lower()))
                    if not addr_elem:
                        addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                    
                    if not addr_elem: continue
                    address = addr_elem.text.strip()
                    if len(address) < 5: continue
                    
                    # 2. ENHANCED PRICE DETECTION (Regex Everywhere)
                    price = 0
                    full_text = card.get_text(separator=' ')
                    
                    # Robust Regex: Look for £ followed by digits
                    price_match = re.search(r'£\s?(\d{2,3})', full_text)
                    if not price_match:
                        # Fallback: look for digits followed by pppw or pw
                        price_match = re.search(r'(\d{2,3})\s?pppw', full_text.lower())
                    
                    if price_match:
                        price = int(price_match.group(1))

                    # 3. VALIDATION GATE: NO £0 properties
                    if price < 70 or price > 1000:
                        continue

                    # 4. Meta detection (Beds/Baths)
                    beds = 1
                    beds_match = re.search(r'(\d+)\s?bed', full_text.lower())
                    if beds_match: beds = int(beds_match.group(1))

                    baths = 1
                    baths_match = re.search(r'(\d+)\s?bath', full_text.lower())
                    if baths_match: baths = int(baths_match.group(1))

                    all_listings.append({
                        "id": f"scraped-{hash(address + str(price))}",
                        "address": address,
                        "price_pppw": price,
                        "beds": beds,
                        "baths": baths,
                        "source": "UniHomes",
                        "area": "Exeter",
                        "bills_included": "bills" in full_text.lower()
                    })
                    page_found_count += 1
                except:
                    continue
            
            print(f"[Watcher] Page {page} processed. Found {page_found_count} valid properties.")
            if page_found_count == 0:
                print("[Watcher] No valid listings on this page. Stopping pagination.")
                break
                
            page += 1
            time.sleep(1) # Polite delay

        except Exception as e:
            print(f"[Watcher] Error on page {page}: {e}")
            break

    print(f"Step 5: Total Valid Listings Extracted: {len(all_listings)}")

    # --- DATABASE PUSH ---
    if all_listings:
        print(f"Step 6: Pushing data to Supabase...")
        success_count = 0
        for listing in all_listings:
            try:
                # Upsert uses numeric price_pppw
                supabase.table("properties").upsert({
                    "id": listing["id"],
                    "address": listing["address"],
                    "price_pppw": listing["price_pppw"],
                    "beds": listing["beds"],
                    "baths": listing["baths"],
                    "bills_included": listing["bills_included"],
                    "area": listing["area"],
                    "landlord_id": TEST_LANDLORD_ID,
                    "notes": f"High-Quality Scrape from {listing['source']}"
                }).execute()
                success_count += 1
            except Exception as e:
                print(f"Step 6 Error for {listing['address']}: {e}")
        
        print(f"--- Step 7: Process Complete. Successfully pushed {success_count} high-quality listings. ---")
    else:
        print("Step 6 Error: No listings found to push.")

if __name__ == "__main__":
    main()
