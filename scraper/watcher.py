import os
import requests
from bs4 import BeautifulSoup
import json
import re
import time
from urllib.parse import urljoin
from datetime import datetime, timezone
from supabase import create_client, Client

def main():
    print("--- Step 1: ExeLodge Watcher Starting High-Quality Scrape ---")
    
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

    print("Step 3: Cleaning up all existing property data for fresh start...")
    try:
        supabase.table("properties").delete().neq("id", "0").execute()
        print(f"Step 3 Success: Database cleared.")
    except Exception as e:
        print(f"Step 3 Warning: Cleanup failed: {e}")

    TEST_LANDLORD_ID = 'general'
    try:
        supabase.table("landlords").upsert({
            "id": TEST_LANDLORD_ID,
            "name": "General Landlord",
            "type": "Scraped Source"
        }).execute()
    except:
        pass

    BASE_URL = "https://www.unihomes.co.uk/student-accommodation/exeter"
    all_listings = []
    page = 1
    # 1. HARD LIMIT: Max 10 pages
    max_pages = 10

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }

    print(f"Step 4: Starting Recursive Multi-Page Scrape (Hard Limit: {max_pages} pages)...")

    stop_entire_scrape = False
    while page <= max_pages:
        if stop_entire_scrape:
            break

        url = f"{BASE_URL}?page={page}" if page > 1 else BASE_URL
        print(f"[Watcher] Fetching Page {page}: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code != 200:
                print(f"[Watcher] Page {page} returned status {response.status_code}. Stopping pagination.")
                break
            
            soup = BeautifulSoup(response.text, 'html.parser')
            cards = soup.find_all(['div', 'article', 'section'], class_=lambda x: x and ('property' in x.lower() or 'card' in x.lower() or 'listing' in x.lower()))
            
            # 3. EMPTY PAGE CHECK: If a page returns 0 properties, exit the loop.
            if not cards:
                print(f"[Watcher] No properties found on page {page}. Exiting loop.")
                break

            page_found_count = 0
            for card in cards:
                try:
                    # 4. DUPLICATE CHECK: Use property URL as a unique ID
                    link_elem = card.find('a', href=True)
                    external_url = urljoin("https://www.unihomes.co.uk", link_elem['href']) if link_elem else None
                    
                    if not external_url:
                        continue

                    # Image URL
                    img_elem = card.find('img')
                    raw_image_url = None
                    if img_elem:
                        raw_image_url = img_elem.get('data-src') or img_elem.get('src')
                    
                    image_url = urljoin("https://www.unihomes.co.uk", raw_image_url) if raw_image_url else None

                    # Address
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong', 'p'], class_=lambda x: x and ('address' in x.lower() or 'title' in x.lower()))
                    if not addr_elem:
                        addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                    if not addr_elem: continue
                    address = addr_elem.text.strip()
                    if len(address) < 5: continue

                    # 2. LOCATION CHECK: verify 'address' contains "Exeter"
                    if "exeter" not in address.lower():
                        print(f"[Watcher] Location mismatch found ('{address}'). STOPPING IMMEDIATELY.")
                        stop_entire_scrape = True
                        break

                    # Price
                    price = 0
                    full_text = card.get_text(separator=' ')
                    price_match = re.search(r'£\s?(\d{2,3})', full_text)
                    if not price_match:
                        price_match = re.search(r'(\d{2,3})\s?pppw', full_text.lower())
                    if price_match:
                        price = int(price_match.group(1))

                    # Secondary Scrape if price is 0
                    if price == 0 and external_url:
                        try:
                            sub_res = requests.get(external_url, headers=headers, timeout=10)
                            sub_soup = BeautifulSoup(sub_res.text, 'html.parser')
                            sub_text = sub_soup.get_text(separator=' ')
                            sub_match = re.search(r'£\s?(\d{2,3})', sub_text)
                            if not sub_match:
                                sub_match = re.search(r'(\d{2,3})\s?pppw', sub_text.lower())
                            if sub_match:
                                price = int(sub_match.group(1))
                        except:
                            pass

                    if price < 70 or price > 1000:
                        continue

                    # Beds/Baths
                    beds = 1
                    beds_match = re.search(r'(\d+)\s?bed', full_text.lower())
                    if beds_match: beds = int(beds_match.group(1))

                    baths = 1
                    baths_match = re.search(r'(\d+)\s?bath', full_text.lower())
                    if baths_match: baths = int(baths_match.group(1))

                    all_listings.append({
                        "id": external_url, # Using URL as unique ID
                        "address": address,
                        "price_pppw": price,
                        "beds": beds,
                        "baths": baths,
                        "source": "UniHomes",
                        "area": "Exeter",
                        "bills_included": "bills" in full_text.lower(),
                        "external_url": external_url,
                        "image_url": image_url
                    })
                    page_found_count += 1
                except:
                    continue
            
            print(f"[Watcher] Page {page} processed. Found {page_found_count} valid properties.")
            page += 1
            time.sleep(1)

        except Exception as e:
            print(f"[Watcher] Error on page {page}: {e}")
            break

    print(f"Step 5: Total Valid Listings Extracted: {len(all_listings)}")

    if all_listings:
        print(f"Step 6: Pushing data to Supabase...")
        success_count = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        
        for listing in all_listings:
            try:
                supabase.table("properties").upsert({
                    "id": listing["id"],
                    "address": listing["address"],
                    "price_pppw": listing["price_pppw"],
                    "beds": listing["beds"],
                    "baths": listing["baths"],
                    "bills_included": listing["bills_included"],
                    "area": listing["area"],
                    "landlord_id": TEST_LANDLORD_ID,
                    "external_url": listing["external_url"],
                    "image_url": listing["image_url"],
                    "last_scraped": now_iso,
                    "notes": f"High-Quality Scrape from {listing['source']}"
                }).execute()
                success_count += 1
            except Exception as e:
                print(f"Step 6 Error for {listing['address']}: {e}")
        
        print(f"--- Step 7: Process Complete. Successfully pushed {success_count} listings. ---")
    else:
        print("Step 6 Error: No listings found to push.")

if __name__ == "__main__":
    main()
