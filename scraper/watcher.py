import os
import requests
from bs4 import BeautifulSoup
import json
import re
import time
import hashlib
from urllib.parse import urljoin
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

# --- SCRAPING CONFIGURATION ---
SOURCES = [
    {"name": "UniHomes", "url": "https://www.unihomes.co.uk/student-accommodation/exeter", "base": "https://www.unihomes.co.uk"},
    {"name": "StuRents", "url": "https://sturents.com/student-accommodation/exeter/listings", "base": "https://sturents.com"},
    {"name": "AccommodationForStudents", "url": "https://www.accommodationforstudents.com/exeter", "base": "https://www.accommodationforstudents.com"},
    {"name": "Cardens", "url": "https://www.cardensestateagents.co.uk/students", "base": "https://www.cardensestateagents.co.uk"},
    {"name": "Rightmove", "url": "https://www.rightmove.co.uk/property-to-rent/Exeter.html", "base": "https://www.rightmove.co.uk"},
]

DEFAULT_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'

AREA_MAPPINGS = {
    'Pennsylvania': ['pennsylvania', 'danes road', 'hoopern', 'howell road', 'powderham', 'union road', 'hillsborough', 'rosebarn', 'mowbray', 'queen\'s crescent', 'kilbarran', 'belvidere'],
    'St James': ['st james', 'old tiverton', 'blackboy road', 'springfield road', 'victoria street', 'well street', 'prospect park', 'culverland', 'iddesleigh', 'st james road', 'york road'],
    'City Centre': ['city centre', 'longbrook', 'north street', 'high street', 'sidwell', 'queen street', 'northernhay', 'iron bridge', 'bartholomew', 'clifton', 'bampfylde', 'paris street', 'cheeke street'],
    'Newtown': ['newtown', 'elmside', 'sandford walk', 'belmont', 'gladstone', 'portland street', 'codrington', 'clifton road'],
    'Heavitree': ['heavitree', 'homefield', 'atlas house', 'st lister', 'hamlin', 'magdalen road', 'polsham'],
    'Mount Pleasant': ['mount pleasant', 'pinhoe road', 'monks road', 'monkswell', 'priory road', 'polsloe'],
    'St Davids': ['st davids', 'bonhay', 'richmond court', 'king edward', 'point exe', 'new north road', 'eldertree', 'st davids hill'],
    'St Leonards': ['st leonards', 'magdalen road', 'barnardo road', 'archibald', 'mount radford', 'wonford road'],
    'Riverside': ['riverside', 'quay', 'renslade', 'exwick'],
    'Haldon': ['haldon'],
}

def clean_price(price_str):
    if not price_str: return 0.0
    cleaned = re.sub(r'[£,]', '', str(price_str))
    match = re.search(r'(\d+\.?\d*)', cleaned)
    return float(match.group(1)) if match else 0.0

def clean_address(address):
    if not address: return ""
    address = re.sub(r'Student accommodation in', '', address, flags=re.IGNORECASE)
    address = re.sub(r'^From\s?£\d+\s?-\s?', '', address, flags=re.IGNORECASE)
    address = re.sub(r'^\d+\s?properties in\s?', '', address, flags=re.IGNORECASE)
    address = re.sub(r'Image\s?\d+\s?of\s?\d+', '', address, flags=re.IGNORECASE)
    address = re.sub(r'Exeter', '', address, flags=re.IGNORECASE)
    address = address.strip().strip('-').strip().strip(',')
    return address

def detect_area(address, url, full_text):
    search_space = f"{address} {url} {full_text}".lower()
    for area, keywords in AREA_MAPPINGS.items():
        if any(k in search_space for k in keywords):
            return area
    return "Exeter"

def extract_best_image(card, base_url):
    imgs = card.find_all('img')
    candidates = []
    for img in imgs:
        src = img.get('data-src') or img.get('src') or img.get('data-lazy-src') or img.get('data-original')
        if not src: continue
        full_url = urljoin(base_url, src)
        src_lower = src.lower()
        if '.svg' in src_lower or any(k in src_lower for k in ['icon', 'logo', 'marker', 'placeholder', 'star', 'rating', 'user', 'avatar']): continue
        score = 0
        if any(k in src_lower for k in ['property', 'listing', 'photo', 'image']): score += 10
        if '.jpg' in src_lower or '.jpeg' in src_lower or '.webp' in src_lower: score += 5
        candidates.append((score, full_url))
    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]
    return DEFAULT_FALLBACK_IMAGE

def is_likely_address(text):
    text_lower = text.lower()
    if any(k in text_lower for k in ['question', 'faq', 'september', 'october', 'august', 'july', 'june', 'may', 'april', 'march', 'february', 'january', 'results', 'properties']):
        return False
    if len(text.split()) < 2:
        return False
    return True

def scrape_source(source, supabase):
    print(f"--- Scraping Source: {source['name']} ---")
    all_listings = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }

    page = 1
    max_pages = 25
    seen_urls_source = set()
    
    while page <= max_pages:
        url = source['url']
        if page > 1:
            if 'rightmove' in url: url = url.replace('.html', f'?index={24 * (page-1)}.html')
            elif 'sturents' in url: url = f"{url}?offset={12 * (page-1)}"
            else: url = f"{url}?page={page}"
            
        try:
            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code != 200: break
            soup = BeautifulSoup(response.text, 'html.parser')
            potential_cards = soup.find_all(['div', 'article', 'section', 'a'], class_=lambda x: x and any(k in x.lower() for k in ['property', 'card', 'listing', 'result', 'item']))
            
            found_on_page = 0
            for card in potential_cards:
                full_text = card.get_text(separator=' ')
                if '£' not in full_text and '&pound;' not in full_text: continue
                try:
                    addr_el = card.find(['h2', 'h3', 'h4', 'strong'])
                    if not addr_el: addr_el = card.find('p', class_=lambda x: x and 'address' in x.lower())
                    address = clean_address(addr_el.text.strip()) if addr_el else ""
                    if not is_likely_address(address): continue
                    
                    price_match = re.search(r'(?:£|&pound;)\s?(\d{2,4})', full_text)
                    price_pppw = float(price_match.group(1)) if price_match else 0.0
                    
                    beds = 1
                    beds_match = re.search(r'(\d+)\s?(?:bed|bedroom)', full_text.lower())
                    if beds_match: beds = int(beds_match.group(1))
                    elif 'studio' in full_text.lower(): beds = 1

                    baths = 1
                    baths_match = re.search(r'(\d+)\s?(?:bath|bathroom)', full_text.lower())
                    if baths_match: 
                        baths = int(baths_match.group(1))
                    elif 'en-suite' in full_text.lower() or 'ensuite' in full_text.lower():
                        baths = beds

                    link_el = card.find('a', href=True) if card.name != 'a' else card
                    external_url = urljoin(source['base'], link_el['href']) if link_el else source['url']
                    
                    # Force unique URL per Listing to prevent de-duplication
                    # We use address+price to ensure uniqueness across pages
                    listing_key = f"{address}-{price_pppw}-{beds}".lower()
                    addr_hash = hashlib.md5(listing_key.encode()).hexdigest()[:8]
                    if '?' in external_url: external_url = f"{external_url}&lid={addr_hash}"
                    else: external_url = f"{external_url}?lid={addr_hash}"

                    if external_url in seen_urls_source: continue
                    seen_urls_source.add(external_url)

                    area = detect_area(address, external_url, full_text)
                    image_url = extract_best_image(card, source['base'])
                    
                    all_listings.append({
                        "address": address,
                        "price_pppw": price_pppw,
                        "beds": beds,
                        "baths": baths,
                        "area": area,
                        "external_url": external_url,
                        "image_url": image_url,
                        "landlord_id": source['name']
                    })
                    found_on_page += 1
                except: continue
            print(f"[{source['name']}] Page {page}: Found {found_on_page} unique on source.")
            if found_on_page == 0: break
            page += 1
            time.sleep(2)
        except: break
    return all_listings

def main():
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    total_upserted = 0
    for source in SOURCES:
        try:
            try: supabase.table("landlords").upsert({"id": source['name'], "name": source['name'], "type": "Agency"}).execute()
            except: pass
            listings = scrape_source(source, supabase)
            source_count = 0
            for item in listings:
                try:
                    if any(k in item['address'].lower() for k in ['question', 'halls in', 'houses in', 'studios in', 'flats in']):
                        continue
                    item["last_scraped"] = datetime.now(timezone.utc).isoformat()
                    item.pop('id', None)
                    supabase.table("properties").upsert(item, on_conflict="external_url").execute()
                    source_count += 1
                    total_upserted += 1
                except: pass
            print(f"[SUCCESS] {source['name']} total upserted: {source_count}")
        except Exception as e:
            print(f"[ERROR] {source['name']}: {e}")
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        supabase.table("properties").delete().lt("last_scraped", cutoff).execute()
    except: pass
    print(f"Done. Total processed: {total_upserted}")

if __name__ == "__main__":
    main()
