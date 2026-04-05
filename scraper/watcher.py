import os
import requests
from bs4 import BeautifulSoup
import json
import re
import time
from urllib.parse import urljoin
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

# --- SCRAPING CONFIGURATION ---
# Updated URLs to be even more Exeter-specific
SOURCES = [
    {"name": "UniHomes", "url": "https://www.unihomes.co.uk/student-accommodation/exeter", "base": "https://www.unihomes.co.uk"},
    {"name": "StuRents", "url": "https://sturents.com/student-accommodation/exeter/listings", "base": "https://sturents.com"},
    {"name": "AccommodationForStudents", "url": "https://www.accommodationforstudents.com/exeter", "base": "https://www.accommodationforstudents.com"},
    {"name": "Cardens", "url": "https://cardensestateagents.co.uk/properties-to-rent/student-properties-to-rent", "base": "https://cardensestateagents.co.uk"},
    {"name": "Rightmove", "url": "https://www.rightmove.co.uk/property-to-rent/Exeter.html", "base": "https://www.rightmove.co.uk"},
]

DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'

def scrape_source(source, supabase, landlord_id):
    print(f"--- Scraping Source: {source['name']} ---")
    all_listings = []
    page = 1

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }

    # Target 10 pages per source to ensure volume without infinite loops
    while page <= 10:
        url = f"{source['url']}?page={page}" if page > 1 else source['url']
        print(f"[{source['name']}] Fetching Page {page}: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code != 200:
                print(f"[{source['name']}] Status {response.status_code}. Moving to next source.")
                break
            
            soup = BeautifulSoup(response.text, 'html.parser')
            cards = soup.find_all(['div', 'article', 'section'], class_=lambda x: x and any(k in x.lower() for k in ['property', 'card', 'listing', 'result']))
            
            if not cards:
                print(f"[{source['name']}] No cards found on page {page}. Moving to next source.")
                break

            page_found_count = 0
            for card in cards:
                try:
                    # Link / ID
                    link_elem = card.find('a', href=True)
                    if not link_elem: continue
                    external_url = urljoin(source['base'], link_elem['href'])
                    
                    # Address / Anchor Check
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong', 'p'], class_=lambda x: x and any(k in x.lower() for k in ['address', 'title', 'location']))
                    if not addr_elem: addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                    if not addr_elem: continue
                    address = addr_elem.text.strip()
                    if len(address) < 5: continue

                    # FIX: Simple Anchor Check (Never break the loop)
                    is_exeter = "exeter" in address.lower() or "ex4" in address.lower() or "ex1" in address.lower() or "ex2" in address.lower() or "exeter" in external_url.lower()
                    if not is_exeter:
                        continue # Just skip this property

                    # Image
                    img_elem = card.find('img')
                    raw_image_url = None
                    if img_elem:
                        raw_image_url = img_elem.get('data-src') or img_elem.get('src')
                    image_url = urljoin(source['base'], raw_image_url) if raw_image_url else DEFAULT_FALLBACK_IMAGE

                    # Price
                    price = 0
                    full_text = card.get_text(separator=' ')
                    price_match = re.search(r'£\s?(\d{2,3})', full_text)
                    if not price_match:
                        price_match = re.search(r'(\d{2,3})\s?pppw', full_text.lower())
                    
                    if price_match:
                        price = int(price_match.group(1))
                    
                    if price < 70 or price > 1000:
                        continue

                    # Beds
                    beds = 1
                    beds_match = re.search(r'(\d+)\s?bed', full_text.lower())
                    if beds_match: beds = int(beds_match.group(1))

                    all_listings.append({
                        "id": external_url,
                        "address": address,
                        "price_pppw": price,
                        "beds": beds,
                        "source": source['name'],
                        "area": "Exeter",
                        "external_url": external_url,
                        "image_url": image_url
                    })
                    page_found_count += 1
                except:
                    continue
            
            if page_found_count == 0:
                print(f"[{source['name']}] No valid Exeter listings on page {page}. Stopping source.")
                break

            page += 1
            time.sleep(0.5)

        except Exception as e:
            print(f"[{source['name']}] Error on page {page}: {e}")
            break
            
    return all_listings

def main():
    print("--- Step 1: ExeLodge Multi-Source Scraper Starting ---")
    
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

    TEST_LANDLORD_ID = 'general'
    try:
        supabase.table("landlords").upsert({"id": TEST_LANDLORD_ID, "name": "General Landlord", "type": "Scraped Source"}).execute()
    except:
        pass

    total_listings = []
    for source in SOURCES:
        try:
            source_listings = scrape_source(source, supabase, TEST_LANDLORD_ID)
            total_listings.extend(source_listings)
            print(f"[Watcher] Source {source['name']} yielded {len(source_listings)} listings.")
        except Exception as e:
            print(f"[Watcher] CRITICAL error on source {source['name']}: {e}")

    print(f"Step 3: Total Extracted: {len(total_listings)}")

    if total_listings:
        print(f"Step 4: Pushing to Supabase (Robust logic)...")
        success_count = 0
        now_iso = datetime.now(timezone.utc).isoformat()
        
        for listing in total_listings:
            # STEP 2: ROBUST PUSH LOGIC WITH RETRIES
            print(f"DEBUG: Attempting to push to column external_url with value: {listing['external_url']}")
            
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    supabase.table("properties").upsert({
                        "id": listing["id"],
                        "address": listing["address"],
                        "price_pppw": listing["price_pppw"],
                        "beds": listing["beds"],
                        "area": listing["area"],
                        "landlord_id": TEST_LANDLORD_ID,
                        "external_url": listing["external_url"],
                        "image_url": listing["image_url"],
                        "last_scraped": now_iso,
                        "notes": f"Scraped from {listing['source']}"
                    }).execute()
                    success_count += 1
                    break # Success!
                except Exception as e:
                    print(f"Step 4 Error (Attempt {attempt+1}/{max_retries}) for {listing['address']}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(1) # Wait before retry
        
        print(f"[Watcher] Successfully pushed {success_count} listings.")

        print("Step 5: Cleaning up stale data (older than 48 hours)...")
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
            supabase.table("properties").delete().lt("last_scraped", cutoff).execute()
            print("Step 5 Success: Stale data cleared.")
        except Exception as e:
            print(f"Step 5 Warning: Cleanup failed: {e}")
            
    print(f"--- Step 6: Process Complete. ---")

if __name__ == "__main__":
    main()
