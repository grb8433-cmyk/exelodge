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
SOURCES = [
    {"name": "UniHomes", "url": "https://www.unihomes.co.uk/student-accommodation/exeter", "base": "https://www.unihomes.co.uk"},
    {"name": "StuRents", "url": "https://sturents.com/student-accommodation/exeter/listings", "base": "https://sturents.com"},
    {"name": "AccommodationForStudents", "url": "https://www.accommodationforstudents.com/exeter", "base": "https://www.accommodationforstudents.com"},
    {"name": "Cardens", "url": "https://cardensestateagents.co.uk/properties-to-rent/student-properties-to-rent", "base": "https://cardensestateagents.co.uk"},
    {"name": "Rightmove", "url": "https://www.rightmove.co.uk/property-to-rent/Exeter.html", "base": "https://www.rightmove.co.uk"},
]

DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'

def clean_price(price_str):
    """Removes currency symbols and commas, returns a float."""
    if not price_str:
        return 0.0
    if isinstance(price_str, (int, float)):
        return float(price_str)
    # Remove £ and ,
    cleaned = re.sub(r'[£,]', '', str(price_str))
    # Extract numeric part
    match = re.search(r'(\d+\.?\d*)', cleaned)
    return float(match.group(1)) if match else 0.0

def scrape_source(source, supabase, landlord_id):
    print(f"--- Scraping Source: {source['name']} ---")
    all_listings = []
    page = 1

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }

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
                    link_elem = card.find('a', href=True)
                    if not link_elem: continue
                    external_url = urljoin(source['base'], link_elem['href'])
                    
                    addr_elem = card.find(['h2', 'h3', 'h4', 'strong', 'p'], class_=lambda x: x and any(k in x.lower() for k in ['address', 'title', 'location']))
                    if not addr_elem: addr_elem = card.find(['h2', 'h3', 'h4', 'strong'])
                    if not addr_elem: continue
                    address = addr_elem.text.strip()
                    if len(address) < 5: continue

                    is_exeter = any(k in address.lower() for k in ["exeter", "ex4", "ex1", "ex2"]) or "exeter" in external_url.lower()
                    if not is_exeter:
                        continue

                    img_elem = card.find('img')
                    raw_image_url = None
                    if img_elem:
                        raw_image_url = img_elem.get('data-src') or img_elem.get('src')
                    image_url = urljoin(source['base'], raw_image_url) if raw_image_url else DEFAULT_FALLBACK_IMAGE

                    price_raw = 0
                    full_text = card.get_text(separator=' ')
                    price_match = re.search(r'£\s?(\d{2,3})', full_text)
                    if not price_match:
                        price_match = re.search(r'(\d{2,3})\s?pppw', full_text.lower())
                    
                    if price_match:
                        price_raw = price_match.group(1)
                    
                    beds = 1
                    beds_match = re.search(r'(\d+)\s?bed', full_text.lower())
                    if beds_match: beds = beds_match.group(1)

                    baths = 1
                    baths_match = re.search(r'(\d+)\s?bath', full_text.lower())
                    if baths_match: baths = baths_match.group(1)

                    all_listings.append({
                        "address": address,
                        "price_pppw": price_raw,
                        "beds": beds,
                        "baths": baths,
                        "source": source['name'],
                        "area": "Exeter",
                        "external_url": external_url,
                        "image_url": image_url,
                        "landlord_id": source['name']
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

    try:
        supabase.table("landlords").upsert({"id": "general", "name": "General Landlord", "type": "Scraped Source"}).execute()
    except:
        pass

    total_listings = []
    for source in SOURCES:
        try:
            try:
                supabase.table("landlords").upsert({"id": source['name'], "name": source['name'], "type": "Agency"}).execute()
            except:
                pass
                
            source_listings = scrape_source(source, supabase, source['name'])
            total_listings.extend(source_listings)
            print(f"[Watcher] Source {source['name']} yielded {len(source_listings)} listings.")
        except Exception as e:
            print(f"[Watcher] CRITICAL error on source {source['name']}: {e}")

    print(f"Step 3: Total Extracted: {len(total_listings)}")

    if total_listings:
        print(f"Step 4: Pushing to Supabase (Type-Safe Upsert)...")
        success_count = 0
        
        for item in total_listings:
            try:
                # TASK 1: Explicitly define payload with type casting and cleaning
                payload = {
                    "id": str(item['external_url']),
                    "address": str(item['address']),
                    "price_pppw": clean_price(item['price_pppw']),
                    "beds": int(item['beds']) if item['beds'] else 1,
                    "baths": int(item['baths']) if item['baths'] else 1,
                    "area": str(item['area']),
                    "image_url": str(item['image_url']),
                    "external_url": str(item['external_url']),
                    "landlord_id": str(item['landlord_id']),
                    "last_scraped": datetime.now(timezone.utc).isoformat()
                }

                if payload['price_pppw'] < 70 or payload['price_pppw'] > 1000:
                    continue

                print(f"DEBUG: Upserting: {payload['address']} ({payload['price_pppw']})")
                
                supabase.table("properties").upsert(payload, on_conflict="external_url").execute()
                success_count += 1
                
                time.sleep(0.1)
            except Exception as e:
                print(f"Step 4 Error for {item['address']}: {e}")
        
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
