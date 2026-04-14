import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urlunparse, parse_qs, urlencode
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

try:
    from dotenv import load_dotenv
    # Force override to ensure we use .env even if shell has old keys
    load_dotenv(override=True)
except ImportError:
    pass

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'
MIN_PPPW      = 100.0   # Minimum credible pppw for Exeter student housing
MAX_PPPW      = 300.0

STREATHAM_COORDS = (50.7367, -3.5336)
ST_LUKES_COORDS  = (50.7226, -3.5177)

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    ),
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
}

AREA_MAPPINGS = {
    'Pennsylvania':   ['pennsylvania', 'danes road', 'hoopern', 'howell road', 'powderham',
                       'union road', 'hillsborough', 'rosebarn', 'mowbray', "queen's crescent",
                       'kilbarran', 'belvidere'],
    'St James':       ['st james', 'old tiverton', 'blackboy road', 'springfield road',
                       'victoria street', 'well street', 'prospect park', 'culverland',
                       'iddesleigh', 'st james road', 'york road'],
    'City Centre':    ['city centre', 'longbrook', 'north street', 'high street', 'sidwell',
                       'queen street', 'northernhay', 'iron bridge', 'bartholomew', 'clifton',
                       'bampfylde', 'paris street', 'cheeke street'],
    'Newtown':        ['newtown', 'elmside', 'sandford walk', 'belmont', 'gladstone',
                       'portland street', 'codrington', 'clifton road'],
    'Heavitree':      ['heavitree', 'homefield', 'atlas house', 'st lister', 'hamlin',
                       'magdalen road', 'polsham'],
    'Mount Pleasant': ['mount pleasant', 'pinhoe road', 'monks road', 'monkswell',
                       'priory road', 'polsloe'],
    'St Davids':      ['st davids', 'bonhay', 'richmond court', 'king edward', 'point exe',
                       'new north road', 'eldertree', 'st davids hill'],
    'St Leonards':    ['st leonards', 'magdalen road', 'barnardo road', 'archibald',
                       'mount radford', 'wonford road'],
    'Riverside':      ['riverside', 'quay', 'renslade', 'exwick'],
    'Haldon':         ['haldon'],
}

# ─── HELPERS ─────────────────────────────────────────────────────────────────

import math

def haversine(coord1, coord2):
    """Calculate the great-circle distance between two points in miles."""
    if not coord1 or not coord2:
        return None
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 3958.8  # Radius of the Earth in miles

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def extract_postcode(text):
    """Extract a UK postcode or outcode from text."""
    if not text:
        return None
    # 1. Try full postcode (e.g. EX4 4QJ)
    m = re.search(r'\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b', text.upper())
    if m: return m.group(1)
    # 2. Try outcode only (e.g. EX1, EX4)
    m = re.search(r'\b(EX\d)\b', text.upper())
    return m.group(1) if m else None


_POSTCODE_CACHE = {}

def get_coordinates(postcode):
    """Fetch lat/lng for a postcode from postcodes.io."""
    if not postcode:
        return None
    
    clean_pc = postcode.replace(' ', '').upper()
    if clean_pc in _POSTCODE_CACHE:
        return _POSTCODE_CACHE[clean_pc]
    
    url = f'https://api.postcodes.io/postcodes/{clean_pc}'
    try:
        time.sleep(0.5)  # Rate limit
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            result = r.json().get('result')
            if result:
                coords = (result.get('latitude'), result.get('longitude'))
                _POSTCODE_CACHE[clean_pc] = coords
                return coords
        elif r.status_code == 404:
            _POSTCODE_CACHE[clean_pc] = None
    except Exception as e:
        print(f'  [GEO-ERROR] {postcode}: {e}')
    
    return None


def detect_area(text):
    t = text.lower()
    for area, kws in AREA_MAPPINGS.items():
        if any(k in t for k in kws):
            return area
    return 'Exeter'


def validate_postcode(text):
    """
    Check if the text contains an Exeter postcode EX1-EX6.
    Log [GEO-SKIP] for any listing whose postcode falls outside this range.
    """
    # Find all postcode-like patterns (e.g. EX1, EX17, TQ12)
    # This matches the prefix of a UK postcode.
    postcodes = re.findall(r'\b([A-Z]{1,2}\d{1,2})\b', text.upper())
    
    ex_postcodes = [pc for pc in postcodes if pc.startswith('EX')]
    if ex_postcodes:
        for pc in ex_postcodes:
            try:
                num = int(re.search(r'\d+', pc).group())
                if 1 <= num <= 6:
                    return True
            except (ValueError, AttributeError):
                continue
        # Found EX postcodes but none are 1-6
        return False
    
    # If other postcodes are found (like TQ, PL, BS) but no EX postcodes, skip
    other_postcodes = [pc for pc in postcodes if not pc.startswith('EX')]
    if other_postcodes:
        return False

    # No postcode found at all. Since we scrape Exeter-specific URLs,
    # we assume it's Exeter unless it mentions a different city.
    OTHER_CITIES = {'LONDON', 'BRISTOL', 'PLYMOUTH', 'BIRMINGHAM', 'LEEDS', 'MANCHESTER'}
    text_upper = text.upper()
    if any(city in text_upper for city in OTHER_CITIES) and 'EXETER' not in text_upper:
        return False

    return True


def validate(listing):
    """Return (True, '') or (False, reason)."""
    price = listing.get('price_pppw', 0)
    beds  = listing.get('bedrooms', 0)
    baths = listing.get('bathrooms', 0)
    addr  = listing.get('address', '').strip()
    url   = listing.get('external_url', '')

    if not addr or len(addr.split()) < 2:
        return False, f"address too short: '{addr}'"
    if is_date_str(addr):
        return False, f"address looks like a tenancy date: '{addr}'"
    if is_garbage_address(addr):
        return False, f"address looks like a description/garbage: '{addr}'"
    if not url.startswith('http'):
        return False, f"invalid url: '{url}'"
    if not (MIN_PPPW <= price <= MAX_PPPW):
        if price < MIN_PPPW:
            return False, f"price too low: £{price:.0f} pppw (Min: £{MIN_PPPW:.0f})"
        else:
            return False, f"price too high: £{price:.0f} pppw (Max: £{MAX_PPPW:.0f})"
    if not (1 <= beds <= 12):
        return False, f"beds={beds} out of range 1–12"
    if not (1 <= baths <= beds):
        return False, f"baths={baths} invalid for {beds} beds"
    if not validate_postcode(addr + ' ' + url):
        return False, f"[GEO-SKIP] not in EX1-EX6: '{addr}'"
    return True, ''


def get_page(url, extra=None):
    """Fetch URL → (BeautifulSoup, raw_text) or (None, '')."""
    h = {**HEADERS, **(extra or {})}
    try:
        r = requests.get(url, headers=h, timeout=20)
        if r.status_code != 200:
            print(f'  [HTTP {r.status_code}] {url}')
            return None, ''
        return BeautifulSoup(r.text, 'html.parser'), r.text
    except Exception as e:
        print(f'  [ERROR] {url}: {e}')
        return None, ''


def pick_image(el, base):
    """Return first plausible property image URL, or None if none found."""
    SKIP = {'icon', 'logo', 'marker', 'star', 'avatar', 'no-image', '.svg',
            'placeholder', '/logos/', 'spinner', 'loading'}

    def _try(src):
        if not src or src.startswith('data:'):
            return None
        if any(k in src.lower() for k in SKIP):
            return None
        full = urljoin(base, src)
        return full if full.startswith('http') else None

    def _first_srcset_url(srcset):
        """
        Extract the first URL from a srcset attribute.
        srcset entries are separated by ', ' (comma+space).
        Each entry is: <url> [descriptor].
        Note: URLs themselves may contain commas (CDN resize params),
        so we cannot split on bare commas.
        """
        if not srcset:
            return ''
        # Split on comma followed by whitespace — that separates entries.
        entries = re.split(r',\s+', srcset)
        if entries:
            # First token of the first entry is the URL
            return entries[0].strip().split()[0]
        return ''

    # Check <img> tags
    for img in el.find_all('img'):
        for attr in ('data-src', 'src', 'data-lazy-src', 'data-original',
                     'data-lazy', 'data-bg', 'data-image'):
            result = _try(img.get(attr, ''))
            if result:
                return result
        # img srcset
        result = _try(_first_srcset_url(img.get('srcset', '')))
        if result:
            return result

    # Check <source> tags inside <picture> elements — UniHomes and some other
    # sites put real photo URLs only in <source srcset>, not in the <img> fallback.
    for source in el.find_all('source'):
        result = _try(_first_srcset_url(source.get('srcset', '')))
        if result:
            return result

    return None


# ── Date-address detection ────────────────────────────────────────────────────

_DATE_ADDR_RE = re.compile(
    r'^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)'
    r'(?:\s+\d{4})?$',
    re.I)


def is_date_str(s):
    """Return True if s looks like a tenancy date (e.g. '31 Aug 2026')."""
    return bool(_DATE_ADDR_RE.match((s or '').strip()))


# ── Garbage address detection ─────────────────────────────────────────────────

_STREET_TYPE_RE = re.compile(
    r'\b(?:road|street|lane|avenue|close|drive|way|place|gardens?|terrace|'
    r'hill|rise|court|walk|row|gate|square|crescent|mews|parade|path|'
    r'passage|grove|view|mount|bank|bridge|circus|yard)\b',
    re.I)

_GARBAGE_WORD_RE = re.compile(
    r'^(\d+)\s+('
    r'spacious|beautifully|stylish|available|completely|end|terraced|'
    r'detached|semi|we|this|renovated|modern|apartment|stunning|charming|'
    r'lovely|quality|local|bedroom|bungalow|property|properties|'
    r'converted|furnished|immaculate|impressive|delightful|characterful'
    r')\b',
    re.I)


def is_garbage_address(addr):
    """Return True if addr is clearly not a real property street address."""
    addr = (addr or '').strip()
    if not addr:
        return True
    
    # If it's just a postcode like "EX1" or "EX4 4QJ", it's not a full address
    # but we might want to allow it if it's all we have.
    # However, validate() requires 2+ words.
    
    # "Halls in Exeter", "Flats in Exeter", etc. — category aggregation pages
    if re.match(
            r'^(?:halls?|houses?|flats?|rooms?|studios?|apartments?)\s+in\b',
            addr, re.I):
        return True
    # "5 bedroom house", "1 bedroom flat" — property type description not address
    if re.match(
            r'^\d+\s+bed(?:room)?\s+(?:house|flat|apartment|studio|bungalow)',
            addr, re.I):
        return True
    # "1 Spacious", "2 Stylish", "1 Beautifully" — adjective after house number
    if _GARBAGE_WORD_RE.match(addr) and not _STREET_TYPE_RE.search(addr):
        return True
    # "321673 Local", "999999 Something" — starts with 5+ digit number (property IDs)
    if re.match(r'^\d{5,}\s+\w+', addr):
        return True
    
    # Pure marketing terms without street context
    MARKETING_TERMS = {'STUDENT ONLY', 'AVAILABLE NOW', 'WEEKS', 'SEPTEMBER', 'JULY'}
    addr_upper = addr.upper()
    
    # If it has a pipe and NO street-like words AND matches marketing terms, it's garbage
    if '|' in addr:
        if not _STREET_TYPE_RE.search(addr):
            return True
        # If it has a pipe but also a street type, it might be "Studio 1 | Verney St" -> allow
    
    if any(term in addr_upper for term in MARKETING_TERMS) and not _STREET_TYPE_RE.search(addr):
        return True

    return False


def _sturents_address_from_url(url):
    """Extract a property address from a StuRents URL slug as a last resort."""
    m = re.search(r'/exeter/([a-z0-9][a-z0-9\-]+)', url, re.I)
    if not m:
        return ''
    slug = m.group(1)
    # Reject generic or date-like slugs
    if re.search(r'\d{4}$', slug) or slug in ('listings', 'search', 'results'):
        return ''
    return slug.replace('-', ' ').title()


_TRACKING_PARAMS = frozenset({
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'ref', 'referrer', 'source', 'fbclid', 'gclid', 'mc_cid', 'mc_eid',
})

def normalize_url(url):
    """
    Normalise a URL for deduplication:
    - lowercase
    - strip fragment (#…)
    - strip tracking query params
    - strip trailing slashes from path
    - strip www. prefix
    """
    try:
        p = urlparse(url.strip().lower())
        netloc = p.netloc
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        clean_query = {k: v for k, v in parse_qs(p.query).items()
                       if k not in _TRACKING_PARAMS}
        normalised = urlunparse((
            p.scheme,
            netloc,
            p.path.rstrip('/'),
            p.params,
            urlencode(clean_query, doseq=True),
            '',            # drop fragment
        ))
        return normalised
    except Exception:
        return url.strip().lower().rstrip('/')


def calculate_pppw(raw_value, unit, beds, url, landlord):
    """
    Methodical pppw conversion with strict sanity checks.
    Units: 'pppw', 'pppw_property', 'pppm', 'ppm_property'
    """
    try:
        val = float(str(raw_value).replace('£', '').replace(',', '').strip())
    except (ValueError, TypeError):
        return None

    pppw = None
    if unit == 'pppw':
        pppw = val
    elif unit == 'pppw_property':
        if not beds or beds <= 0:
            print(f'  [NO-BEDS][{landlord}] {url}')
            return None
        pppw = val / beds
    elif unit == 'pppm':
        pppw = (val * 12) / 52
    elif unit == 'ppm_property':
        if not beds or beds <= 0:
            print(f'  [NO-BEDS][{landlord}] {url}')
            return None
        pppw = (val * 12) / 52 / beds
    else:
        print(f'  [WARN][{landlord}] Unknown unit "{unit}" for {url}')
        return None

    if pppw is not None:
        # Sanity check
        if not (MIN_PPPW <= pppw <= MAX_PPPW):
            print(f'  [PRICE-OUT][{landlord}] raw={val}, unit={unit}, beds={beds}, '
                  f'calc_pppw=£{pppw:.2f} | {url}')
            return None
        
        # Realistic increment check (max 2 decimal places)
        if round(pppw, 2) != round(pppw, 4):
            print(f'  [PRICE-WARN][{landlord}] Unrealistic pppw precision: £{pppw} | {url}')
        
        return round(pppw, 2)
    
    return None


# ─── SCRAPERS ────────────────────────────────────────────────────────────────

def scrape_unihomes():
    """
    UniHomes – Vue SPA with server-side-rendered HTML fallback.
    """
    BASE = 'https://www.unihomes.co.uk'
    results, seen = [], set()

    for page in range(1, 21):
        print(f'  [PAGE] UniHomes page {page}')
        url = f'{BASE}/student-accommodation/exeter' + (f'?page={page}' if page > 1 else '')
        soup, _ = get_page(url)
        if not soup:
            break

        cards = soup.find_all('a', href=re.compile(r'(?:^|unihomes\.co\.uk)/property/\d+'))
        if not cards:
            print(f'  [UniHomes] page {page}: no cards – stopping')
            break

        added = 0
        for card in cards:
            href = card['href']
            ext_url = (href if href.startswith('http') else f'{BASE}{href}').split('?')[0]
            
            if '/student-accommodation/exeter' in ext_url and '/property/' not in ext_url:
                continue

            if ext_url in seen:
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()

            # ── Beds ─────────────────────────────────────────────────────────
            m_beds     = re.search(r'(\d+)[\s-]*bed(?:room)?', text, re.I)
            m_url_beds = re.search(r'/(\d+)[\s-]*bed(?:room)?-', href, re.I)
            if m_beds:
                beds = int(m_beds.group(1))
            elif m_url_beds:
                beds = int(m_url_beds.group(1))
            elif 'studio' in text.lower():
                beds = 1
            else:
                beds = 0

            # ── Price ────────────────────────────────────────────────────────
            price_raw = 0
            unit = None
            m_price = re.search(r'£(\d+(?:\.\d+)?)', text)
            if m_price:
                price_raw = float(m_price.group(1))
                if 'per person per week' in text.lower():
                    unit = 'pppw'
                elif 'per week' in text.lower():
                    unit = 'pppw_property'
            
            if not unit:
                print(f'  [SKIP][UniHomes] no unit label: {ext_url}')
                continue

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'UniHomes')
            if price_pppw is None:
                continue

            # ── Baths ─────────────────────────────────────────────────────────
            m_baths = re.search(r'(\d+)\s+bathroom', text, re.I)
            baths   = min(int(m_baths.group(1)), beds) if (m_baths and beds > 0) else 1

            # ── Address ───────────────────────────────────────────────────────
            # Cards render: <p><img class="map-pin-grey"> Road Name, Area</p>
            # The map-pin <img> makes p.string = None so we can't use string=
            # Instead: find the img by class and get its parent <p>.
            address = ''
            pin_img = card.find('img', class_=re.compile(r'map.?pin|pin.?grey|location', re.I))
            if pin_img:
                addr_el = pin_img.find_parent('p')
                if addr_el:
                    address = re.sub(r'\s+', ' ', addr_el.get_text(' ')).strip()

            if not address:
                # Fallback: first <p> whose text looks like an address (not price)
                for p in card.find_all('p'):
                    txt = re.sub(r'\s+', ' ', p.get_text(' ')).strip()
                    if (txt and '£' not in txt and
                            not re.search(r'per\s+(?:week|person)', txt, re.I) and
                            not re.search(r'^\d+\s+(?:bedroom|room)\b', txt, re.I) and
                            re.search(r'[A-Za-z]{3,}', txt)):
                        address = txt
                        break

            if not address:
                # Last resort: URL slug
                parts   = href.rstrip('/').split('/')
                address = parts[-1].replace('-', ' ').title() if parts else ''

            address = re.sub(r'^\d+\s+Bedroom\s+\S+\s*', '', address, flags=re.I).strip()

            img_url = pick_image(card, BASE)
            if not img_url:
                print(f'  [NO-PHOTO][UniHomes] {ext_url}')

            # ── Available From ───────────────────────────────────────────────
            # UniHomes cards often have "Available Sep 2026" or similar
            m_avail = re.search(r'Available\s+([\d\s\w]+)', text, re.I)
            avail_from = m_avail.group(1).strip() if m_avail else None
            # Basic validation to ensure it looks like a date/month
            if avail_from and not re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})', avail_from, re.I):
                avail_from = None

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'available_from': avail_from,
                'area':          detect_area(f'{address} {href}'),
                'external_url':  ext_url,
                'image_url':     img_url,
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'UniHomes',
            })
            added += 1

        print(f'  [UniHomes] page {page}: {added} new')
        if added == 0:
            break
        time.sleep(1.5)

    return results


def scrape_sturents():
    """
    StuRents – embeds schema.org JSON-LD in <script type="application/ld+json">.
    Also scrapes HTML cards directly.
    Price   : "£XXX pppw" in description/JSON text.
    Pagination: ?offset=N (12 per page).
    """
    BASE = 'https://sturents.com'
    results, seen = [], set()

    for offset in range(0, 240, 12):
        page_num = (offset // 12) + 1
        print(f'  [PAGE] StuRents page {page_num}')
        url = (f'{BASE}/student-accommodation/exeter/listings'
               + (f'?offset={offset}' if offset else ''))
        soup, _ = get_page(url)
        if not soup:
            break

        added = 0

        # Strategy A: HTML cards (Preferred as they contain direct links)
        # Class is 'new--listing-item'
        cards = soup.find_all('a', class_=re.compile(r'new--listing-item'))
        if not cards:
            # Fallback to old selector if they use mixed templates
            cards = soup.find_all(['div', 'article', 'li'],
                                 class_=re.compile(r'listing|property|card|result', re.I))

        for card in cards:
            link = card if card.name == 'a' else card.find('a', href=re.compile(r'/student-accommodation/exeter/'))
            if not link:
                continue
            
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if '/listings' in ext_url or '/search' in ext_url:
                continue
            if ext_url in seen:
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            
            # ── Beds & Baths ─────────────────────────────────────────────────
            # .new--heading-200 often has "Studio" or "4 Bedroom"
            bm = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
            beds = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)
            baths = 1 # Fallback

            # ── Address ──────────────────────────────────────────────────────
            # Priority: 1. h2/h3/h4 or .new--listing-title
            title_el = card.select_one('.new--listing-title, h2, h3, h4')
            address = title_el.get_text(strip=True) if title_el else ''
            
            if not address or is_date_str(address) or address.lower() == 'house':
                # Try finding any text that looks like a street address
                for el in card.find_all(['p', 'span', 'div']):
                    txt = el.get_text(strip=True)
                    if txt and not is_date_str(txt) and _STREET_TYPE_RE.search(txt):
                        address = txt
                        break
            
            if not address:
                address = _sturents_address_from_url(ext_url)

            # Special case for Verney St pattern in StuRents
            if '|' in address and 'Verney St' in address:
                address = 'Verney Street, St Sidwells'

            if not address or is_date_str(address):
                print(f'  [INVALID][StuRents] {address!r} – address too short/garbage')
                continue

            # ── Price ────────────────────────────────────────────────────────
            price_raw = 0
            unit = None
            pm = re.search(r'£\s*(\d+(?:\.\d+)?)\s*(pppw|per person per week)', text, re.I)
            if pm:
                price_raw = float(pm.group(1))
                unit = 'pppw'
            else:
                # Try JSON data-house if available
                try:
                    data_house = json.loads(card.get('data-house', '{}'))
                    price_raw = float(data_house.get('rent', 0))
                    # StuRents rent field is usually pppw but let's check text for safety
                    if 'pppw' in text.lower() or 'per person per week' in text.lower():
                        unit = 'pppw'
                except:
                    pass

            if not unit:
                print(f'  [SKIP][StuRents] no unit label: {ext_url}')
                continue

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'StuRents')
            if price_pppw is None:
                continue

            # ── Image ────────────────────────────────────────────────────────
            img_url = card.get('data-photo') or pick_image(card, BASE)

            # ── Available From ───────────────────────────────────────────────
            m_avail = re.search(r'(?:Available|From)\s+(\d{1,2}\s+[A-Z][a-z]{2,}\s+\d{4})', text, re.I)
            avail_from = m_avail.group(1) if m_avail else None

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'available_from': avail_from,
                'area':          detect_area(address),
                'external_url':  ext_url,
                'image_url':     img_url,
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'StuRents',
            })
            added += 1

        print(f'  [StuRents] offset {offset}: {added} found')
        if added == 0 and offset > 0:
            break
        time.sleep(1.5)

    return results


def scrape_accommodationforstudents():
    """
    AccommodationForStudents (AFS) – Next.js app.
    Strategy A: parse <script id="__NEXT_DATA__"> JSON.
    Strategy B: scrape HTML links to /property/{id}-{slug}.
    Price: AFS shows per-person per-week → use directly as pppw.
    Pagination: ?page=N
    """
    BASE = 'https://www.accommodationforstudents.com'
    results, seen = [], set()

    for page in range(1, 21):
        print(f'  [PAGE] AFS page {page}')
        url = f'{BASE}/exeter' + (f'?page={page}' if page > 1 else '')
        soup, _ = get_page(url)
        if not soup:
            break

        added = 0

        # Strategy A: __NEXT_DATA__
        nd_script = soup.find('script', id='__NEXT_DATA__')
        if nd_script:
            try:
                nd         = json.loads(nd_script.string or '{}')
                page_props = nd.get('props', {}).get('pageProps', {})
                vm         = page_props.get('viewModel', page_props)
                properties = (vm.get('properties') or vm.get('listings') or
                              vm.get('results') or [])

                for prop in properties:
                    if not isinstance(prop, dict):
                        continue

                    ext_url = prop.get('url') or prop.get('link') or ''
                    if not ext_url:
                        pid  = prop.get('id') or prop.get('propertyId') or ''
                        slug = prop.get('slug') or ''
                        ext_url = f'{BASE}/property/{pid}-{slug}' if pid else ''
                    if not ext_url:
                        continue
                    if not ext_url.startswith('http'):
                        ext_url = urljoin(BASE, ext_url)
                    
                    # [BAD-URL] check: if it's just the search page
                    if ext_url.endswith('/exeter') or '?page=' in ext_url:
                        print(f'  [BAD-URL] AFS: {ext_url}')
                        continue

                    if ext_url in seen:
                        continue
                    seen.add(ext_url)

                    # ── Beds & Baths ─────────────────────────────────────────────────
                    beds  = max(1, int(prop.get('bedrooms') or prop.get('beds') or 1))
                    baths = max(1, int(prop.get('bathrooms') or prop.get('baths') or 1))
                    baths = min(baths, beds)

                    # ── Price ────────────────────────────────────────────────────────
                    price_raw = 0
                    unit = None
                    p_val = prop.get('price') or prop.get('weeklyPrice') or prop.get('pricePerWeek') or 0
                    try:
                        price_raw = float(str(p_val).replace('£', '').replace(',', '').split()[0])
                    except:
                        pass
                    
                    # Determine unit
                    blob = str(prop).lower()
                    if 'pppw' in blob or 'per person' in blob:
                        unit = 'pppw'
                    elif 'pw' in blob or '/week' in blob:
                        # In AFS halls are usually pppw even if they say /week
                        if prop.get('propertyType', '').lower() == 'hall' or 'hall' in blob:
                            unit = 'pppw'
                        else:
                            unit = 'pppw_property'
                    elif 'pcm' in blob or 'month' in blob:
                        unit = 'ppm_property' # Fallback for AFS houses
                    
                    if not unit:
                        # Final fallback check on the price magnitude
                        if 100 <= price_raw <= 300:
                            unit = 'pppw'
                        else:
                            print(f'  [SKIP][AFS] no unit label: {ext_url}')
                            continue

                    price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'AccommodationForStudents')
                    if price_pppw is None:
                        continue

                    addr_parts = [prop.get('address') or prop.get('street') or '',
                                  prop.get('area') or prop.get('district') or '']
                    address = ', '.join(p for p in addr_parts if p).strip(', ')
                    if not address:
                        address = prop.get('title') or prop.get('name') or ''

                    img_raw = (prop.get('image') or prop.get('imageUrl') or
                               prop.get('thumbnail') or '')
                    img = img_raw if (img_raw and str(img_raw).startswith('http')) else None
                    if not img:
                        print(f'  [NO-PHOTO][AFS] {ext_url}')

                    # ── Available From ───────────────────────────────────────────────
                    avail_from = prop.get('availableFrom') or prop.get('availableDate')
                    if not avail_from:
                        m_avail = re.search(r'(?:Available|From)\s+(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})', str(prop), re.I)
                        avail_from = m_avail.group(1) if m_avail else None

                    results.append({
                        'address':       address,
                        'price_pppw':    round(price_pppw, 2),
                        'bedrooms':      beds,
                        'bathrooms':     baths,
                        'available_from': avail_from,
                        'area':          detect_area(address),
                        'external_url':  ext_url,
                        'image_url':     img,
                        'bills_included': bool(
                            prop.get('billsIncluded') or
                            re.search(r'bills?\s+inclu', str(prop), re.I)),
                        'landlord_id':   'AccommodationForStudents',
                    })
                    added += 1
            except Exception as e:
                print(f'  [AFS] __NEXT_DATA__ error page {page}: {e}')

        # Strategy B: HTML link scraping
        if added == 0:
            for link in soup.find_all('a', href=re.compile(r'/property/\d+')):
                ext_url = urljoin(BASE, link['href']).split('?')[0]
                
                # [BAD-URL] check: if it's just the search page
                if ext_url.endswith('/exeter') or '?page=' in ext_url:
                    print(f'  [BAD-URL] AFS: {ext_url}')
                    continue

                if ext_url in seen:
                    continue

                # Walk up to the card container
                card = link.find_parent(['article', 'div', 'li']) or link
                seen.add(ext_url)

                text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
                if '£' not in text:
                    continue

                # ── Beds & Baths ─────────────────────────────────────────────────
                bm    = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
                beds  = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)
                btm   = re.search(r'(\d+)\s+bathroom', text, re.I)
                baths = min(int(btm.group(1)), beds) if (btm and beds > 0) else 1

                # ── Price ────────────────────────────────────────────────────────
                price_raw = 0
                unit = None
                # AFS card format: "£ 215 /week" or "£215 pppw"
                pm = re.search(r'£\s*(\d+(?:\.\d+)?)', text)
                if pm:
                    price_raw = float(pm.group(1))
                    lower_text = text.lower()
                    if 'pppw' in lower_text or 'per person' in lower_text:
                        unit = 'pppw'
                    elif '/week' in lower_text or 'per week' in lower_text:
                        # For AFS halls are usually pppw
                        if 'hall' in lower_text:
                            unit = 'pppw'
                        else:
                            unit = 'pppw_property'
                    elif 'pcm' in lower_text or 'per month' in lower_text:
                        unit = 'ppm_property'
                
                if not unit:
                    # Final fallback check on magnitude
                    if 100 <= price_raw <= 300:
                        unit = 'pppw'
                    else:
                        print(f'  [SKIP][AFS] no unit label: {ext_url}')
                        continue

                price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'AccommodationForStudents')
                if price_pppw is None:
                    continue

                # AFS card: h2/h3 contains "N bedroom house/flat" (type, not address).
                # The real address is in <p class="...address..."> (CardBase__address).
                addr_el = card.find('p', class_=re.compile(r'address', re.I))
                if addr_el:
                    address = re.sub(
                        r',?\s*Exeter.*$', '',
                        addr_el.get_text(strip=True), flags=re.I).strip()
                else:
                    # Fallback: aria-label="N bedroom house - Street, Area, Exeter"
                    aria = link.get('aria-label', '')
                    if ' - ' in aria:
                        address = re.sub(
                            r',?\s*Exeter.*$', '',
                            aria.split(' - ', 1)[1].strip(), flags=re.I).strip()
                    else:
                        h = card.find(['h2', 'h3', 'h4'])
                        address = h.get_text(strip=True) if h else link.get_text(strip=True)

                afs_img = pick_image(card, BASE)
                if not afs_img:
                    print(f'  [NO-PHOTO][AFS] {ext_url}')

                # ── Available From ───────────────────────────────────────────────
                m_avail = re.search(r'(?:Available|From)\s+(?:from\s+)?(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})', text, re.I)
                avail_from = m_avail.group(1) if m_avail else None

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'available_from': avail_from,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     afs_img,
                    'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                    'landlord_id':   'AccommodationForStudents',
                })
                added += 1

        print(f'  [AFS] page {page}: {added} new')
        if added == 0:
            break
        time.sleep(1.5)

    return results


def scrape_cardens():
    """
    Cardens Estate Agents – uses a session and browser-like headers to avoid 403.
    """
    BASE  = 'https://www.cardensestateagents.co.uk'
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9,en;q=0.8',
        'Referer': 'https://www.google.com/',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    })
    
    results, seen = [], set()

    for page in range(1, 21):
        print(f'  [PAGE] Cardens page {page}')
        url  = f'{BASE}/students' + (f'?page={page}' if page > 1 else '')
        
        if page > 1:
            time.sleep(2)

        try:
            r = session.get(url, timeout=20)
            if r.status_code != 200:
                print(f'  [HTTP {r.status_code}] Cardens: {url}')
                if r.status_code == 403:
                    print('  [Cardens] Blocked by 403 – stopping')
                    break
                break
            soup = BeautifulSoup(r.text, 'html.parser')
        except Exception as e:
            print(f'  [ERROR] Cardens: {e}')
            break

        cards = (soup.select('div.property-item, div.property-card, article.property') or
                 soup.find_all('a', href=re.compile(r'/property(?:ies)?/')))
        if not cards:
            print(f'  [Cardens] page {page}: no cards – stopping')
            break

        added = 0
        for card in cards:
            link      = card if card.name == 'a' else card.find('a', href=True)
            container = card
            if not link:
                continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            
            if ext_url.endswith('/students') or '?page=' in ext_url:
                continue

            if ext_url in seen:
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', container.get_text(' ')).strip()
            if '£' not in text:
                continue

            # ── Beds & Baths ─────────────────────────────────────────────────
            bm   = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
            beds = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)
            btm   = re.search(r'(\d+)\s+bathroom', text, re.I)
            baths = min(int(btm.group(1)), beds) if (btm and beds > 0) else 1

            # ── Price ────────────────────────────────────────────────────────
            price_raw = 0
            unit = None
            pm_val = re.search(r'£([\d,]+)', text)
            if pm_val:
                price_raw = float(pm_val.group(1).replace(',', ''))
                lower_text = text.lower()
                if 'pppw' in lower_text or 'per person per week' in lower_text:
                    unit = 'pppw'
                elif 'pw' in lower_text or 'per week' in lower_text:
                    unit = 'pppw_property'
                elif 'pcm' in lower_text or 'per month' in lower_text:
                    unit = 'ppm_property'
            
            if not unit:
                print(f'  [SKIP][Cardens] no unit label: {ext_url}')
                continue

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'Cardens')
            if price_pppw is None:
                continue

            h       = container.find(['h2', 'h3', 'h4'])
            address = h.get_text(strip=True) if h else ''

            cardens_img = pick_image(container, BASE)
            if not cardens_img:
                print(f'  [NO-PHOTO][Cardens] {ext_url}')

            # ── Available From ───────────────────────────────────────────────
            m_avail = re.search(r'(?:Available|From)\s+(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})', text, re.I)
            avail_from = m_avail.group(1) if m_avail else None

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'available_from': avail_from,
                'area':          detect_area(address),
                'external_url':  ext_url,
                'image_url':     cardens_img,
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'Cardens',
            })
            added += 1

        print(f'  [Cardens] page {page}: {added} new')
        if added == 0:
            break
        time.sleep(1.5)

    return results


def scrape_rightmove():
    """
    Rightmove – student accommodation section.
    URL       : /student-accommodation/Exeter.html
    Strategy A: parse __NEXT_DATA__ JSON (props.pageProps.searchResults.properties).
                Rightmove migrated from window.jsonModel to Next.js in 2025/26.
    Strategy B: scrape HTML cards with links /properties/{id}.
    Price     : pcm → (pcm × 12 / 52) / beds = pppw
                pw/weekly → pw / beds = pppw
    Pagination: ?index=N (25 per page)
    """
    BASE = 'https://www.rightmove.co.uk'
    results, seen = [], set()

    for page_idx in range(0, 20):
        index = page_idx * 25
        print(f'  [PAGE] Rightmove page {page_idx + 1} (index={index})')
        url   = (f'{BASE}/student-accommodation/Exeter.html'
                 + (f'?index={index}' if index else ''))
        soup, raw = get_page(url)
        if not soup:
            break

        added = 0

        # Strategy A: __NEXT_DATA__ (new Rightmove Next.js structure)
        nd_script = soup.find('script', id='__NEXT_DATA__')
        if nd_script:
            try:
                nd    = json.loads(nd_script.string or '{}')
                model = (nd.get('props', {})
                           .get('pageProps', {})
                           .get('searchResults', {}))
            except Exception:
                model = {}
        else:
            # Legacy fallback: window.jsonModel (pre-2025)
            model = {}
            for script in soup.find_all('script'):
                src = script.string or ''
                m   = re.search(r'window\.jsonModel\s*=\s*(\{.+\})\s*;?\s*'
                                r'(?:window\.|</script>)', src, re.S)
                if m:
                    try:
                        model = json.loads(m.group(1))
                    except Exception:
                        pass
                    break

        for prop in model.get('properties', []):
                pid = prop.get('id')
                if not pid:
                    continue
                ext_url = f'{BASE}/properties/{pid}#/?channel=STU_LET'
                
                # [BAD-URL] check: if it's just the search page
                if '/student-accommodation' in ext_url and '/properties/' not in ext_url:
                    print(f'  [BAD-URL] Rightmove: {ext_url}')
                    continue

                if ext_url in seen:
                    continue
                seen.add(ext_url)

                price_info = prop.get('price', {})
                amount     = float(price_info.get('amount') or 0)
                freq       = str(price_info.get('frequency', '')).lower()
                qualifier  = str(prop.get('displayPriceQualifier', '')).lower()
                beds       = max(1, int(prop.get('bedrooms') or 1))
                baths      = max(1, int(prop.get('bathrooms') or 1))
                baths      = min(baths, beds)

                # Determine unit
                unit = None
                if 'weekly' in freq:
                    if 'per person' in qualifier:
                        unit = 'pppw'
                    else:
                        unit = 'pppw_property'
                elif 'monthly' in freq:
                    if 'per person' in qualifier:
                        unit = 'pppm'
                    else:
                        unit = 'ppm_property'
                
                if not unit:
                    print(f'  [SKIP][Rightmove] no unit detected: amount={amount}, freq={freq}, qual={qualifier} | {ext_url}')
                    continue

                price_pppw = calculate_pppw(amount, unit, beds, ext_url, 'Rightmove')
                
                # Detailed audit log for EVERY Rightmove listing
                print(f'  [Rightmove Audit] pid={pid}, amount={amount}, freq={freq}, qual={qualifier}, beds={beds} -> pppw=£{price_pppw if price_pppw else "FILTERED"}')

                if price_pppw is None:
                    continue

                # ── Address Recovery ─────────────────────────────────────────
                addr_obj = prop.get('address', {})
                display_addr = str(addr_obj.get('displayAddress') or prop.get('displayAddress') or '')
                
                address = re.sub(r',?\s*Exeter.*$', '', display_addr, flags=re.I).strip()
                
                # Check for Verney St pattern specifically
                if 'Verney St' in display_addr:
                    address = 'Verney Street, St Sidwells'
                
                if is_garbage_address(address):
                    # Attempt recovery
                    line1 = addr_obj.get('line1') or ''
                    line2 = addr_obj.get('line2') or ''
                    outcode = addr_obj.get('outcode') or ''
                    incode = addr_obj.get('incode') or ''
                    postcode = f"{outcode} {incode}".strip()
                    if not postcode: postcode = extract_postcode(display_addr) or ''
                    
                    recovered = ''
                    if line1 and not is_garbage_address(line1):
                        recovered = line1
                    elif line2 and not is_garbage_address(line2):
                        recovered = line2
                    
                    if recovered:
                        if postcode and postcode.startswith('EX'):
                            address = f"{recovered}, {postcode}"
                        else:
                            address = f"{recovered}, Exeter"
                    elif postcode and postcode.startswith('EX'):
                        area = prop.get('area') or 'Student Property'
                        address = f"{area}, {postcode}"
                    elif not is_garbage_address(display_addr):
                        address = re.sub(r',?\s*Exeter.*$', '', display_addr, flags=re.I).strip()
                    else:
                        title = prop.get('text', {}).get('title') or ''
                        if title and not is_garbage_address(title):
                            address = title
                    
                if is_garbage_address(address) or len(address.split()) < 2:
                    print(f'  [RIGHTMOVE-ADDR-WARN] marketing address for pid={pid}: '
                          f'{display_addr!r} → skipping')
                    seen.discard(ext_url)
                    continue

                # Rightmove images: mainImageSrc is most reliable (single URL)
                prop_imgs = prop.get('propertyImages', {})
                image_url = None
                # 1. mainImageSrc — direct CDN URL on the property card
                main_src = prop_imgs.get('mainImageSrc') or ''
                if main_src and str(main_src).startswith('http'):
                    image_url = str(main_src)
                # 2. images[0].srcUrl array
                if not image_url:
                    imgs = (prop_imgs.get('images') or prop.get('images') or [])
                    if imgs:
                        first = imgs[0]
                        src = (first.get('srcUrl') or first.get('url') or '')
                        if src and str(src).startswith('http'):
                            image_url = str(src)
                if not image_url:
                    print(f'  [NO-PHOTO][Rightmove] pid={pid}')

                # ── Available From ───────────────────────────────────────────────
                avail_from = prop.get('letAvailableDate')
                if not avail_from:
                    m_avail = re.search(r'(?:Available|From)\s+(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})', str(prop), re.I)
                    avail_from = m_avail.group(1) if m_avail else None

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'available_from': avail_from,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     image_url,
                    'bills_included': 'bill' in str(prop).lower(),
                    'landlord_id':   'Rightmove',
                })
                added += 1

        # Strategy B: HTML cards
        if added == 0:
            for link in soup.find_all('a', href=re.compile(r'/properties/\d+')):
                pid     = re.search(r'/properties/(\d+)', link['href']).group(1)
                ext_url = f'{BASE}/properties/{pid}#/?channel=STU_LET'
                
                # [BAD-URL] check: if it's just the search page
                if '/student-accommodation' in ext_url and '/properties/' not in ext_url:
                    print(f'  [BAD-URL] Rightmove: {ext_url}')
                    continue

                if ext_url in seen:
                    continue

                # Walk up to card container
                card = link
                for _ in range(6):
                    if card.parent:
                        card = card.parent
                    if len(card.get_text()) > 60:
                        break
                seen.add(ext_url)

                text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
                if '£' not in text:
                    continue

                # ── Beds & Baths ─────────────────────────────────────────────────
                bm   = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
                beds = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)
                btm   = re.search(r'(\d+)\s+bath(?:room)?', text, re.I)
                baths = min(int(btm.group(1)), beds) if (btm and beds > 0) else 1

                # ── Price ────────────────────────────────────────────────────────
                price_raw = 0
                unit = None
                pm_val = re.search(r'£([\d,]+)', text)
                if pm_val:
                    price_raw = float(pm_val.group(1).replace(',', ''))
                    lower_text = text.lower()
                    if 'pppw' in lower_text or 'per person' in lower_text:
                        unit = 'pppw'
                    elif 'pw' in lower_text or 'per week' in lower_text:
                        unit = 'pppw_property'
                    elif 'pcm' in lower_text or 'per month' in lower_text:
                        unit = 'ppm_property'
                
                if not unit:
                    print(f'  [SKIP][Rightmove] no unit label: {ext_url}')
                    continue

                price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'Rightmove')
                print(f'  [Rightmove B Audit] pid={pid}, amount={price_raw}, unit={unit}, beds={beds} -> pppw=£{price_pppw if price_pppw else "FILTERED"}')

                if price_pppw is None:
                    continue

                h       = card.find(['h2', 'h3', 'h4', 'address'])
                address = h.get_text(strip=True) if h else ''
                
                # Check for Verney St pattern specifically
                if 'Verney St' in address:
                    address = 'Verney Street, St Sidwells'
                else:
                    address = re.sub(r',?\s*Exeter.*$', '', address, flags=re.I).strip()

                rm_img = pick_image(card, BASE)
                if not rm_img:
                    print(f'  [NO-PHOTO][Rightmove] pid={pid}')

                # ── Available From ───────────────────────────────────────────────
                m_avail = re.search(r'(?:Available|From)\s+(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})', text, re.I)
                avail_from = m_avail.group(1) if m_avail else None

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'available_from': avail_from,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     rm_img,
                    'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                    'landlord_id':   'Rightmove',
                })
                added += 1

        print(f'  [Rightmove] page {page_idx + 1} (index={index}): {added} new')
        if added == 0:
            break
        time.sleep(2.0)

    return results


def scrape_rsj():
    """
    RSJ Investments (Private Landlord)
    URL: https://rsjinvestments.com/property_tag/exeter/
    """
    BASE = "https://rsjinvestments.com"
    results = []
    
    for page_idx in range(1, 10):
        url = f"{BASE}/property_tag/exeter/" + (f"page/{page_idx}/" if page_idx > 1 else "")
        soup, _ = get_page(url)
        if not soup: break
        
        cards = soup.select('div.rem_property')
        if not cards: 
            # Try alternative selector
            cards = soup.select('.rem-property-box')
            if not cards: break
        
        added = 0
        for card in cards:
            link = card.select_one('h2 a, .property-title a, .img-container a')
            if not link: continue
            ext_url = urljoin(BASE, link['href'])
            
            if '/property/' not in ext_url or '/author/' in ext_url:
                continue
            
            # User clarification: 'Let' on RSJ means available for rent.
            # We will scrape everything.
                
            title = link.text.strip()
            addr_tag = card.select_one('span.address-text')
            address = addr_tag.text.strip() if addr_tag else title
            address = re.sub(r',?\s*EX\d.*$', '', address, flags=re.I).strip()
            
            price_tag = card.select_one('span.rem-price-amount')
            price_pppw = float(price_tag.text.replace(',', '').replace('£', '')) if price_tag else 0
            
            beds = 0
            bed_tag = card.find('span', title='Beds')
            if bed_tag:
                m_beds = re.search(r'\d+', bed_tag.text)
                if m_beds: beds = int(m_beds.group())
            
            baths = 1
            bath_tag = card.find('span', title='Baths')
            if bath_tag:
                m_baths = re.search(r'\d+', bath_tag.text)
                if m_baths: baths = int(m_baths.group())
            
            img_tag = card.select_one('img.rem-f-image')
            image_url = img_tag['src'] if img_tag else None
            
            results.append({
                'address': address,
                'price_pppw': price_pppw,
                'bedrooms': beds,
                'bathrooms': baths,
                'area': detect_area(address),
                'external_url': ext_url,
                'image_url': image_url,
                'landlord_id': 'RSJInvestments',
                'bills_included': False 
            })
            added += 1
        
        print(f'  [RSJ] page {page_idx}: {added} found')
        if added == 0: break
        time.sleep(1)
        
    return results


def scrape_star():
    """
    Star Students (Agency)
    URL: https://star-students.com/property-to-rent
    """
    BASE = "https://star-students.com"
    results = []
    
    # This site seems to load all on one page or use standard pagination
    url = f"{BASE}/property-to-rent"
    soup, _ = get_page(url)
    if not soup: return []
    
    cards = soup.select('div.card')
    for card in cards:
        link = card.select_one('a.card-image-container')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        
        # Check if Let
        img_container = card.select_one('.card-image')
        if img_container and 'let' in img_container.text.lower():
            continue
            
        price_tag = card.select_one('span.price-value')
        price_raw = float(price_tag.text.replace('£', '').replace(',', '')) if price_tag else 0
        
        # Address/Title
        content = card.select_one('.card-content')
        title = content.select_one('a').text.strip() if content else ""
        address = title
        if ' in ' in address:
            address = address.split(' in ')[-1]
        
        # Detail extraction
        beds = 0
        bed_icon = card.select_one('i.fa-bed')
        if bed_icon:
            beds_text = bed_icon.find_next_sibling('span', class_='number')
            if beds_text: beds = int(beds_text.text.strip())
            
        baths = 1
        bath_icon = card.select_one('i.fa-bathtub')
        if bath_icon:
            baths_text = bath_icon.find_next_sibling('span', class_='number')
            if baths_text: baths = int(baths_text.text.strip())
            
        img = card.select_one('img')
        image_url = img['data-src'] if img and img.has_attr('data-src') else (img['src'] if img else None)
        
        # Price unit check - Star usually lists pppw
        unit = 'pppw'
        price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'StarStudents')
        
        results.append({
            'address': address,
            'price_pppw': price_pppw,
            'bedrooms': beds,
            'bathrooms': baths,
            'area': detect_area(address),
            'external_url': ext_url,
            'image_url': image_url,
            'landlord_id': 'StarStudents',
            'bills_included': 'bill' in card.text.lower()
        })
        
    return results


def scrape_gillams():
    """
    Gillams Properties (Agency)
    URL: https://www.gillams-properties.co.uk/student-houses/exeter#properties
    """
    BASE = "https://www.gillams-properties.co.uk"
    results = []
    
    url = f"{BASE}/student-houses/exeter"
    soup, _ = get_page(url)
    if not soup: return []
    
    cards = soup.select('article.ssr-property-card')
    for card in cards:
        link = card.select_one('h3.ssr-card-title a')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        
        # Status
        badges = card.select_one('.ssr-card-badges')
        if badges and 'let' in badges.text.lower():
            continue
            
        title = link.text.strip()
        # "8 bed house - 64 Danes Road Exeter" -> "64 Danes Road"
        address = title
        if ' - ' in address:
            address = address.split(' - ')[-1]
        address = re.sub(r',?\s*Exeter.*$', '', address, flags=re.I).strip()
        
        # Price - Gillams shows inclusive and rent-only. We prefer rent-only if available for pppw consistency
        # Or we just take the first primary price.
        price_tag = card.select_one('.ssr-card-price')
        price_text = price_tag.text if price_tag else ""
        price_raw = 0
        m_price = re.search(r'£([\d\.]+)', price_text)
        if m_price:
            price_raw = float(m_price.group(1))
            
        # Beds
        meta = card.select_one('.ssr-card-meta')
        beds = 0
        if meta:
            m_beds = re.search(r'(\d+)\s+bed', meta.text)
            if m_beds: beds = int(m_beds.group(1))
            
        # Image - The SSR version doesn't always have images in the card, but let's check
        img_tag = card.find_parent('div').select_one('img') # Might be outside article in some layouts
        image_url = img_tag['src'] if img_tag else None
        
        results.append({
            'address': address,
            'price_pppw': price_raw, # Gillams price is usually already pppw
            'bedrooms': beds,
            'bathrooms': 1, # Default
            'area': detect_area(address),
            'external_url': ext_url,
            'image_url': image_url,
            'landlord_id': 'Gillams',
            'bills_included': 'inclusive' in card.text.lower()
        })
        
    return results


# ─── DEDUPLICATION ────────────────────────────────────────────────────────────

def deduplicate(listings):
    """
    Pass 1: deduplicate by normalised external_url (strips tracking params,
            fragments, trailing slashes, www. prefix, lowercased).
    Pass 2: deduplicate by normalised(address) + bedrooms + price within £10,
            keeping the entry with the highest completeness score.
            Logs whenever the secondary check fires.
    """
    def completeness(l):
        score = 0
        if l.get('image_url'):                 score += 2
        if l.get('bills_included'):            score += 1
        if l['bathrooms'] > 1:                score += 1
        if len(l['address'].split()) > 3:     score += 1
        return score

    def addr_key(l):
        a = re.sub(r'[^a-z0-9]', '', l['address'].lower())
        return f"{a}_{l['bedrooms']}"

    # Pass 1: normalised URL
    by_url = {}
    for l in listings:
        key = normalize_url(l['external_url'])
        if key not in by_url:
            by_url[key] = l
        elif completeness(l) > completeness(by_url[key]):
            by_url[key] = l  # keep more complete record

    # Pass 2: addr+beds+price tolerance
    by_addr = {}
    for l in by_url.values():
        key = addr_key(l)
        if key not in by_addr:
            by_addr[key] = l
        else:
            existing = by_addr[key]
            price_diff = abs(l['price_pppw'] - existing['price_pppw'])
            # Reduced tolerance to £2 to keep different units at same building
            # (e.g. Studio 1 vs Studio 5 with slightly different prices)
            if price_diff <= 2:
                # Treat as same physical property/unit
                print(f'  [DEDUP-ADDR] Same property/unit detected: "{l["address"]}" '
                      f'{l["bedrooms"]}bed £{l["price_pppw"]} ({l["landlord_id"]}) vs '
                      f'£{existing["price_pppw"]} ({existing["landlord_id"]}) '
                      f'– keeping higher-completeness record')
                if completeness(l) > completeness(existing):
                    by_addr[key] = l
            else:
                # Different price → keep both (may be different units)
                by_addr[f"{key}_{int(l['price_pppw'])}"] = l

    return list(by_addr.values())


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    SUPABASE_URL = (os.environ.get('SUPABASE_URL') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_URL'))
    SUPABASE_KEY = (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_ANON_KEY'))
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY '
              '(or EXPO_PUBLIC_ equivalents)')
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    for name in ('UniHomes', 'StuRents', 'AccommodationForStudents', 'Cardens', 'Rightmove'):
        try:
            supabase.table('landlords').upsert(
                {'id': name, 'name': name, 'type': 'Agency'},
                on_conflict='id'
            ).execute()
        except Exception:
            pass

    # ── Scrape ──────────────────────────────────────────────────────────────
    stats = {}
    all_raw = []
    scrapers = [
        ('UniHomes',               scrape_unihomes),
        ('StuRents',               scrape_sturents),
        ('AccommodationForStudents', scrape_accommodationforstudents),
        ('Cardens',                scrape_cardens),
        ('Rightmove',              scrape_rightmove),
        ('RSJInvestments',         scrape_rsj),
        ('StarStudents',           scrape_star),
        ('Gillams',                scrape_gillams),
    ]

    for name, fn in scrapers:
        print(f'\n=== {name} ===')
        stats[name] = {'raw': 0, 'price_filter': 0, 'bad_url': 0, 'bad_addr': 0, 'inserted': 0}
        try:
            raw = fn()
            stats[name]['raw'] = len(raw)
            print(f'  → {len(raw)} raw listings')
            all_raw.extend(raw)
        except Exception as e:
            print(f'  [CRASH] {name}: {e}')

    # ── Validate ─────────────────────────────────────────────────────────────
    valid = []
    for l in all_raw:
        ok, reason = validate(l)
        landlord = l.get("landlord_id","?")
        if ok:
            valid.append(l)
        else:
            if 'price' in reason:
                stats[landlord]['price_filter'] += 1
                print(f'  [PRICE-OUT][{landlord}] '
                      f'{l.get("address","?")} – {reason} '
                      f'url={l.get("external_url","?")}')
            elif 'url' in reason:
                stats[landlord]['bad_url'] += 1
                print(f'  [INVALID][{landlord}] {reason}')
            elif 'address' in reason or 'GEO-SKIP' in reason:
                stats[landlord]['bad_addr'] += 1
                print(f'  [INVALID][{landlord}] {reason}')
            else:
                print(f'  [INVALID][{landlord}] '
                      f'{l.get("address","?")} – {reason}')

    print(f'\nValidation: {len(all_raw)} raw → {len(valid)} valid')

    # ── Deduplicate ───────────────────────────────────────────────────────────
    unique = deduplicate(valid)
    print(f'Dedup:      {len(valid)} valid → {len(unique)} unique')

    # ── Upsert Landlords ───────────────────────────────────────────────────────
    landlord_data = [
        {'id': 'UniHomes', 'name': 'UniHomes', 'type': 'Portal'},
        {'id': 'StuRents', 'name': 'StuRents', 'type': 'Portal'},
        {'id': 'AccommodationForStudents', 'name': 'AccommodationForStudents', 'type': 'Portal'},
        {'id': 'Cardens', 'name': 'Cardens', 'type': 'Agency'},
        {'id': 'Rightmove', 'name': 'Rightmove', 'type': 'Portal'},
        {'id': 'RSJInvestments', 'name': 'RSJ Investments', 'type': 'Landlord'},
        {'id': 'StarStudents', 'name': 'Star Students', 'type': 'Agency'},
        {'id': 'Gillams', 'name': 'Gillams Properties', 'type': 'Agency'},
    ]
    for ld in landlord_data:
        try:
            supabase.table('landlords').upsert(ld).execute()
        except Exception as e:
            print(f"  [LANDLORD ERROR] {ld['id']}: {e}")

    # ── Upsert Properties ─────────────────────────────────────────────────────
    now      = datetime.now(timezone.utc).isoformat()
    upserted = 0
    for l in unique:
        # ── Geocoding & Distance ─────────────────────────────────────────────
        # Optimization: only geocode if we really need to (or skip in test mode)
        # For now, let's keep it but handle the case where it might be slow
        postcode = extract_postcode(f"{l['address']} {l['external_url']}")
        coords = get_coordinates(postcode)
        
        dist_streatham = round(haversine(coords, STREATHAM_COORDS), 1) if coords else None
        dist_st_lukes  = round(haversine(coords, ST_LUKES_COORDS), 1) if coords else None

        row = {
            'address':       l['address'],
            'price_pppw':    l['price_pppw'],
            'bedrooms':      l['bedrooms'],
            'bathrooms':     l['bathrooms'],
            'available_from': l.get('available_from'),
            'area':          l['area'],
            'external_url':  l['external_url'],
            'image_url':     l['image_url'],
            'bills_included': l.get('bills_included', False),
            'landlord_id':   l['landlord_id'],
            'distance_streatham': dist_streatham,
            'distance_st_lukes':  dist_st_lukes,
            'last_scraped':  now,
            'is_available':  True,
        }
        try:
            supabase.table('properties').upsert(row, on_conflict='external_url').execute()
            upserted += 1
            stats[l['landlord_id']]['inserted'] += 1
        except Exception as e:
            print(f'  [DB ERROR] {l["address"]}: {e}')

    print(f'\n┌──────────────────────────┬──────┬────────┬──────────┬──────────┬──────────┐')
    print(f'│ Site                     │ Raw  │ Price  │ Bad URL  │ Bad Addr │ Inserted │')
    print(f'├──────────────────────────┼──────┼────────┼──────────┼──────────┼──────────┤')
    total_raw = total_pf = total_bu = total_ba = total_ins = 0
    for name in ('UniHomes', 'StuRents', 'AccommodationForStudents', 'Cardens', 'Rightmove', 'RSJInvestments', 'StarStudents', 'Gillams'):
        s = stats.get(name, {'raw':0, 'price_filter':0, 'bad_url':0, 'bad_addr':0, 'inserted':0})
        print(f'│ {name:24} │ {s["raw"]:4} │ {s["price_filter"]:6} │ {s["bad_url"]:8} │ {s["bad_addr"]:8} │ {s["inserted"]:8} │')
        total_raw += s['raw']; total_pf += s['price_filter']; total_bu += s['bad_url']; total_ba += s['bad_addr']; total_ins += s['inserted']
    print(f'├──────────────────────────┼──────┼────────┼──────────┼──────────┼──────────┤')
    print(f'│ TOTAL                    │ {total_raw:4} │ {total_pf:6} │ {total_bu:8} │ {total_ba:8} │ {total_ins:8} │')
    print(f'└──────────────────────────┴──────┴────────┴──────────┴──────────┴──────────┘')

    # ── Sample Output Verification ───────────────────────────────────────────
    print('\n=== Sample Output Verification ===')
    for name in ('UniHomes', 'StuRents', 'AccommodationForStudents', 'Cardens', 'Rightmove'):
        samples = [l for l in unique if l['landlord_id'] == name][:3]
        for l in samples:
            postcode = extract_postcode(f"{l['address']} {l['external_url']}")
            coords = get_coordinates(postcode)
            dist_streatham = round(haversine(coords, STREATHAM_COORDS), 1) if coords else None
            nearest = f"{dist_streatham}mi from Streatham" if dist_streatham else "Unknown distance"
            
            print(f'\n  Site: {l["landlord_id"]}')
            print(f'  Address: {l["address"]}')
            print(f'  Bedrooms: {l["bedrooms"]}')
            print(f'  Price: £{l["price_pppw"]} pppw')
            print(f'  Photo: {l["image_url"]}')
            print(f'  URL: {l["external_url"]}')
            print(f'  Available: {l.get("available_from")}')
            print(f'  Distance: {nearest}')

    # ── Remove stale listings (>48 h old) ────────────────────────────────────
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        supabase.table('properties').delete().lt('last_scraped', cutoff).execute()
        print('Stale listings purged.')
    except Exception as e:
        print(f'[WARN] Stale purge failed: {e}')

    print(f'\nDone. {upserted} listings live.')


if __name__ == '__main__':
    main()
