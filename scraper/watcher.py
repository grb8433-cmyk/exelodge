import os
import re
import json
import time
import requests
import argparse
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9"
}

# ─── UNIVERSITIES CONFIG ─────────────────────────────────────────────────────

def load_universities():
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'universities.json')
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] Could not load universities.json: {e}")
        return [{"id": "exeter", "name": "University of Exeter", "city": "Exeter"}]

UNIVERSITIES = load_universities()

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'
MIN_PPPW      = 50.0
MAX_PPPW      = 400.0

UNIVERSITY_SETTINGS = {
    'exeter': {
        'city': 'Exeter',
        'coords': {
            'streatham': (50.7367, -3.5336),
            'st_lukes': (50.7226, -3.5177),
        },
        'postcode_range': r'EX[1-6]',
        'area_mappings': {
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
        },
        'search_urls': {
            'UniHomes': 'https://www.unihomes.co.uk/student-accommodation/exeter',
            'StuRents': 'https://sturents.com/student-accommodation/exeter/listings',
            'AccommodationForStudents': 'https://www.accommodationforstudents.com/exeter',
            'Rightmove': 'https://www.rightmove.co.uk/student-accommodation/Exeter.html',
            'OnTheMarket': 'https://www.onthemarket.com/to-rent/property/exeter/',
            'Cardens': 'https://www.cardensestateagents.co.uk/students',
            'RSJInvestments': 'https://rsjinvestments.com/property_tag/exeter/',
            'StarStudents': 'https://star-students.com/property-to-rent',
            'Gillams': 'https://www.gillams-properties.co.uk/student-houses/exeter'
        }
    },
    'bristol': {
        'city': 'Bristol',
        'coords': {
            'uob': (51.4584, -2.6030), # University of Bristol
            'uwe': (51.5000, -2.5484), # UWE Frenchay
        },
        'postcode_range': r'BS[1-9]|BS1[0-6]|BS34',
        'area_mappings': {
             'City Centre': ['city centre', 'bs1 ', 'bs2 '],
             'Clifton': ['clifton', 'bs8'],
             'Redland': ['redland', 'bs6'],
             'Cotham': ['cotham', 'bs6'],
             'Stokes Croft': ['stokes croft', 'bs1 ', 'bs2 '],
             'Southville': ['southville', 'bs3'],
             'Horfield': ['horfield', 'bs7'],
             'Bishopston': ['bishopston', 'bs7'],
             'Filton': ['filton', 'bs34'],
             'Stoke Bishop': ['stoke bishop', 'bs9'],
        },
        'search_urls': {
            'UniHomes': 'https://www.unihomes.co.uk/student-accommodation/bristol',
            'StuRents': 'https://sturents.com/student-accommodation/bristol',
            'AccommodationForStudents': 'https://www.accommodationforstudents.com/search-results?location=Bristol&minBedrooms=0&occupancy=min&minPrice=0&maxPrice=500&latitude=51.454514&longitude=-2.58791&geo=false&page=1&filterName=location',
            'Rightmove': 'https://www.rightmove.co.uk/student-accommodation/Bristol.html',
            'OnTheMarket': 'https://www.onthemarket.com/to-rent/property/bristol/',
            'UWEStudentPad': 'https://www.uwestudentpad.co.uk/SearchResults/1',
            'BristolSULettings': 'https://www.bristolsulettings.co.uk/properties-to-let',
            'CJHole': 'https://www.cjhole.co.uk/search-results/for-letting/in-united-kingdom/?orderby=price_desc&radius=0.1&department=student',
            'BristolDigs': 'https://bristoldigs.co.uk/rent-flat-or-house-bristol/?department=student&minimum_rent=&maximum_rent=&bedrooms=&minimum_rent_pppm=&maximum_rent_pppm=&minimum_bedrooms=',
            'StudentCrowd': 'https://www.studentcrowd.com/student-accommodation-l1000825-bristol',
            'JointLiving': 'https://jointliving.co.uk/cities/bristol/',
            'UniteStudents': 'https://www.unitestudents.com/student-accommodation/bristol?roomTypes=&lengthOfStay=Full+Year,Academic+Year&academicYear=2026+-+2027&city=BS'
        }
    },
    'southampton': {
        'city': 'Southampton',
        'coords': {
            'highfield': (50.935, -1.396),
            'solent': (50.908, -1.400),
        },
        'postcode_range': r'SO',
        'area_mappings': {
             'City Centre': ['city centre', 'so14'],
             'Highfield': ['highfield', 'so17'],
             'Portswood': ['portswood', 'so17'],
             'Shirley': ['shirley', 'so15'],
             'Swaythling': ['swaythling', 'so16'],
             'Bassett': ['bassett', 'so16'],
        },
        'search_urls': {
            'UniHomes': 'https://www.unihomes.co.uk/student-accommodation/southampton',
            'StuRents': 'https://sturents.com/student-accommodation/southampton',
            'AccommodationForStudents': 'https://www.accommodationforstudents.com/southampton',
            'Rightmove': 'https://www.rightmove.co.uk/student-accommodation/Southampton.html',
            'OnTheMarket': 'https://www.onthemarket.com/to-rent/property/southampton/',
            'StudentCrowd': 'https://www.studentcrowd.com/student-accommodation-l1006420-southampton',
            'EveryStudent': 'https://everystudent.co.uk/southampton-student-accommodation/',
            'AmberStudent': 'https://amberstudent.com/places/search/southampton-1811022771524',
            'StudNoFee': 'https://www.studnofee.com/properties/',
            'iStudentLets': 'https://www.istudentlets.com/search/0_location-ANY/rent_00.00-99.99/rooms_0-9',
        }
    }
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


def extract_postcode(text, pc_range=None):
    """Extract a UK postcode or outcode from text."""
    if not text:
        return None
    
    # Use the specific range for the university if provided
    pattern = pc_range or r'[A-Z]{1,2}\d[A-Z0-9]?'
    
    # 1. Try full postcode (e.g. EX4 4QJ, BS1 2AB)
    m = re.search(fr'\b({pattern}\s?\d[A-Z]{{2}})\b', text.upper())
    if m: return m.group(1)
    
    # 2. Try just the outcode (e.g. EX1, BS8)
    m = re.search(fr'\b({pattern})\b', text.upper())
    if m: return m.group(1)
    
    # 3. Aggressive URL check
    m = re.search(fr'[/-]({pattern})($|[/-])', text.upper())
    if m: return m.group(1)
    
    return None


_POSTCODE_CACHE = {}

def get_coordinates(postcode, address=None, city='Exeter'):
    """Fetch lat/lng for a postcode or street address."""
    geo_headers = {'User-Agent': 'ExeLodge-Student-Housing-App/1.0'}
    
    if postcode:
        clean_pc = postcode.replace(' ', '').upper()
        if clean_pc in _POSTCODE_CACHE:
            return _POSTCODE_CACHE[clean_pc]
        
        url = f'https://api.postcodes.io/postcodes/{clean_pc}'
        try:
            time.sleep(0.4)
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                res = r.json().get('result')
                if res:
                    coords = (res.get('latitude'), res.get('longitude'))
                    _POSTCODE_CACHE[clean_pc] = coords
                    return coords
        except: pass

    # Fallback to street name search
    if address:
        search_term = re.sub(r'City Centre|Exeter|Bristol|Student|Property|Flat \w+|Premium En-Suite', '', address, flags=re.I).strip()
        if not search_term: return None
        
        # Try Photon first (with header)
        url = f"https://photon.komoot.io/api/?q={requests.utils.quote(search_term)},+{city},UK&limit=1"
        try:
            time.sleep(0.5)
            r = requests.get(url, headers=geo_headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data.get('features'):
                    f = data['features'][0]
                    lat, lon = f['geometry']['coordinates'][1], f['geometry']['coordinates'][0]
                    # Basic UK validation
                    if 49.0 <= lat <= 60.0 and -8.0 <= lon <= 2.0:
                        return (lat, lon)
        except: pass

        # Ultimate fallback: Nominatim
        url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(search_term)}+{city}+UK&format=json&limit=1"
        try:
            time.sleep(1.1)
            r = requests.get(url, headers=geo_headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if data:
                    lat, lon = float(data[0]['lat']), float(data[0]['lon'])
                    if 49.0 <= lat <= 60.0 and -8.0 <= lon <= 2.0:
                        return (lat, lon)
        except: pass

    return None


def detect_area(text, area_mappings, default_city='Exeter'):
    t = text.lower()
    for area, kws in area_mappings.items():
        if any(k in t for k in kws):
            return area
    return default_city


def validate_postcode(text, pc_range, city):
    """
    Check if the text contains a valid postcode for the city.
    """
    postcodes = re.findall(r'\b([A-Z]{1,2}\d[A-Z0-9]?)\b', text.upper())
    
    # Check if any found postcode matches the expected range prefix
    if postcodes:
        for pc in postcodes:
            if re.match(pc_range, pc):
                return True
        return False
    
    # No postcode found at all. Check for city name.
    OTHER_CITIES = {'LONDON', 'BRISTOL', 'PLYMOUTH', 'BIRMINGHAM', 'LEEDS', 'MANCHESTER', 'EXETER'}
    text_upper = text.upper()
    if any(c in text_upper for c in OTHER_CITIES):
        return city.upper() in text_upper

    return True


def validate(listing, settings):
    """Return (True, '') or (False, reason)."""
    price = listing.get('price_pppw', 0)
    beds  = listing.get('bedrooms', 0)
    baths = listing.get('bathrooms', 0)
    addr  = listing.get('address', '').strip()
    url   = listing.get('external_url', '')
    city  = settings['city']
    pc_range = settings['postcode_range']

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
    if not (1 <= beds <= 15): # Increased max beds for Bristol halls
        return False, f"beds={beds} out of range 1–15"
    if not (1 <= baths <= beds + 1):
        return False, f"baths={baths} invalid for {beds} beds"
    if not validate_postcode(addr + ' ' + url, pc_range, city):
        return False, f"[GEO-SKIP] not in {city} range ({pc_range}): '{addr}'"
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


def _sturents_address_from_url(url, university_id='exeter'):
    """Extract a property address from a StuRents URL slug as a last resort."""
    m = re.search(fr'/{university_id}/([a-z0-9][a-z0-9\-]+)', url, re.I)
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

    # Heuristic: if the raw value is already in a student pppw range, 
    # many sites mislabel it. Correct for this.
    if val >= 75 and val <= 300 and unit in ('pppw_property', 'ppm_property'):
        # If it's a multi-bed house and the price is e.g. 150, 
        # it's almost certainly pppw, not the whole house.
        if beds and beds > 1:
            unit = 'pppw' if 'pw' in str(unit) else 'pppm'

    pppw = None
    if unit == 'pppw':
        pppw = val
    elif unit == 'pppw_property':
        if not beds or beds <= 0:
            return None
        pppw = val / beds
    elif unit == 'pppm':
        pppw = (val * 12) / 52
    elif unit == 'ppm_property':
        if not beds or beds <= 0:
            return None
        pppw = (val * 12) / 52 / beds
    else:
        return None

    if pppw is not None:
        # Sanity check
        if not (MIN_PPPW <= pppw <= MAX_PPPW):
            return None
        
        return round(pppw, 2)
    
    return None


# ─── SCRAPERS ────────────────────────────────────────────────────────────────

def scrape_unihomes(search_url, university_id, settings):
    """
    UniHomes – Vue SPA with server-side-rendered HTML fallback.
    """
    BASE = 'https://www.unihomes.co.uk'
    results, seen = [], set()

    for page in range(1, 11):
        print(f'  [PAGE] UniHomes page {page}')
        url = search_url + (f'?page={page}' if page > 1 else '')
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
            
            if university_id in ext_url and '/property/' not in ext_url:
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
                continue

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'UniHomes')
            if price_pppw is None:
                continue

            # ── Baths ─────────────────────────────────────────────────────────
            m_baths = re.search(r'(\d+)\s+bathroom', text, re.I)
            baths   = min(int(m_baths.group(1)), beds) if (m_baths and beds > 0) else 1

            # ── Address ───────────────────────────────────────────────────────
            address = ''
            pin_img = card.find('img', class_=re.compile(r'map.?pin|pin.?grey|location', re.I))
            if pin_img:
                addr_el = pin_img.find_parent('p')
                if addr_el:
                    address = re.sub(r'\s+', ' ', addr_el.get_text(' ')).strip()

            if not address:
                for p in card.find_all('p'):
                    txt = re.sub(r'\s+', ' ', p.get_text(' ')).strip()
                    if (txt and '£' not in txt and
                            not re.search(r'per\s+(?:week|person)', txt, re.I) and
                            not re.search(r'^\d+\s+(?:bedroom|room)\b', txt, re.I) and
                            re.search(r'[A-Za-z]{3,}', txt)):
                        address = txt
                        break

            if not address:
                parts   = href.rstrip('/').split('/')
                address = parts[-1].replace('-', ' ').title() if parts else ''

            address = re.sub(r'^\d+\s+Bedroom\s+\S+\s*', '', address, flags=re.I).strip()

            img_url = pick_image(card, BASE)

            m_avail = re.search(r'Available\s+([\d\s\w]+)', text, re.I)
            avail_from = m_avail.group(1).strip() if m_avail else None
            if avail_from and not re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})', avail_from, re.I):
                avail_from = None

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'available_from': avail_from,
                'area':          detect_area(f'{address} {href}', settings['area_mappings'], settings['city']),
                'external_url':  ext_url,
                'image_url':     img_url,
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'UniHomes',
            })
            added += 1

        print(f'  [UniHomes] page {page}: {added} new')
        if added == 0:
            break
        time.sleep(1.0)

    return results


def scrape_sturents(search_url, university_id, settings):
    """
    StuRents – embeds schema.org JSON-LD in <script type="application/ld+json">.
    Also scrapes HTML cards directly.
    """
    BASE = 'https://sturents.com'
    results, seen = [], set()

    for offset in range(0, 120, 12):
        page_num = (offset // 12) + 1
        print(f'  [PAGE] StuRents page {page_num}')
        url = search_url + (f'?offset={offset}' if offset else '')
        soup, _ = get_page(url)
        if not soup:
            break

        added = 0
        cards = soup.find_all('a', class_=re.compile(r'new--listing-item'))
        if not cards:
            cards = soup.find_all(['div', 'article', 'li'],
                                 class_=re.compile(r'listing|property|card|result', re.I))

        for card in cards:
            link = card if card.name == 'a' else card.find('a', href=re.compile(fr'/student-accommodation/{university_id}/'))
            if not link:
                continue
            
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if '/listings' in ext_url or '/search' in ext_url:
                continue
            if ext_url in seen:
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            
            bm = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
            beds = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)
            baths = 1 

            title_el = card.select_one('.new--listing-title, h2, h3, h4')
            address = title_el.get_text(strip=True) if title_el else ''
            
            if not address or is_date_str(address) or address.lower() == 'house':
                for el in card.find_all(['p', 'span', 'div']):
                    txt = el.get_text(strip=True)
                    if txt and not is_date_str(txt) and _STREET_TYPE_RE.search(txt):
                        address = txt
                        break
            
            if not address:
                address = _sturents_address_from_url(ext_url, university_id)

            price_raw = 0
            unit = None
            pm = re.search(r'£\s*(\d+(?:\.\d+)?)\s*(pppw|per person per week)', text, re.I)
            if pm:
                price_raw = float(pm.group(1))
                unit = 'pppw'
            else:
                try:
                    data_house = json.loads(card.get('data-house', '{}'))
                    price_raw = float(data_house.get('rent', 0))
                    if 'pppw' in text.lower() or 'per person per week' in text.lower():
                        unit = 'pppw'
                except:
                    pass

            if not unit:
                continue

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'StuRents')
            if price_pppw is None:
                continue

            img_url = card.get('data-photo') or pick_image(card, BASE)

            m_avail = re.search(r'(?:Available|From)\s+(\d{1,2}\s+[A-Z][a-z]{2,}\s+\d{4})', text, re.I)
            avail_from = m_avail.group(1) if m_avail else None

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'available_from': avail_from,
                'area':          detect_area(address, settings['area_mappings'], settings['city']),
                'external_url':  ext_url,
                'image_url':     img_url,
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'StuRents',
            })
            added += 1

        print(f'  [StuRents] offset {offset}: {added} found')
        if added == 0 and offset > 0:
            break
        time.sleep(1.0)

    return results


def scrape_accommodationforstudents(search_url, university_id, settings):
    """
    AccommodationForStudents (AFS) – Next.js app.
    """
    BASE = 'https://www.accommodationforstudents.com'
    results, seen = [], set()

    for page in range(1, 11):
        print(f'  [PAGE] AFS page {page}')
        url = search_url + (f'&page={page}' if '?' in search_url else f'?page={page}')
        soup, _ = get_page(url)
        if not soup:
            break

        added = 0
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
                    
                    if university_id in ext_url and ('?page=' in ext_url or ext_url.endswith(f'/{university_id}')):
                        continue

                    if ext_url in seen:
                        continue
                    seen.add(ext_url)

                    beds  = max(1, int(prop.get('bedrooms') or prop.get('beds') or 1))
                    baths = max(1, int(prop.get('bathrooms') or prop.get('baths') or 1))

                    price_raw = 0
                    unit = None
                    p_val = prop.get('price') or prop.get('weeklyPrice') or prop.get('pricePerWeek') or 0
                    try:
                        price_raw = float(str(p_val).replace('£', '').replace(',', '').split()[0])
                    except:
                        pass
                    
                    blob = str(prop).lower()
                    if 'pppw' in blob or 'per person' in blob:
                        unit = 'pppw'
                    elif 'pw' in blob or '/week' in blob:
                        if prop.get('propertyType', '').lower() == 'hall' or 'hall' in blob:
                            unit = 'pppw'
                        else:
                            unit = 'pppw_property'
                    
                    if not unit:
                        if 75 <= price_raw <= 300:
                            unit = 'pppw'
                        else:
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

                    avail_from = prop.get('availableFrom') or prop.get('availableDate')

                    results.append({
                        'address':       address,
                        'price_pppw':    round(price_pppw, 2),
                        'bedrooms':      beds,
                        'bathrooms':     baths,
                        'available_from': avail_from,
                        'area':          detect_area(address, settings['area_mappings'], settings['city']),
                        'external_url':  ext_url,
                        'image_url':     img,
                        'bills_included': bool(
                            prop.get('billsIncluded') or
                            re.search(r'bills?\s+inclu', str(prop), re.I)),
                        'landlord_id':   'AccommodationForStudents',
                    })
                    added += 1
            except:
                pass

        if added == 0:
            for link in soup.find_all('a', href=re.compile(r'/property/\d+')):
                ext_url = urljoin(BASE, link['href']).split('?')[0]
                if ext_url in seen: continue
                card = link.find_parent(['article', 'div', 'li']) or link
                seen.add(ext_url)

                text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
                if '£' not in text: continue

                bm    = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
                beds  = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)
                btm   = re.search(r'(\d+)\s+bathroom', text, re.I)
                baths = min(int(btm.group(1)), beds) if (btm and beds > 0) else 1

                price_raw = 0
                unit = None
                pm = re.search(r'£\s*(\d+(?:\.\d+)?)', text)
                if pm:
                    price_raw = float(pm.group(1))
                    lower_text = text.lower()
                    if 'pppw' in lower_text or 'per person' in lower_text:
                        unit = 'pppw'
                    elif '/week' in lower_text or 'per week' in lower_text:
                        unit = 'pppw_property'
                
                if not unit:
                    if 75 <= price_raw <= 300: unit = 'pppw'
                    else: continue

                price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'AccommodationForStudents')
                if price_pppw is None: continue

                addr_el = card.find('p', class_=re.compile(r'address', re.I))
                if addr_el:
                    address = re.sub(fr',?\s*{settings["city"]}.*$', '', addr_el.get_text(strip=True), flags=re.I).strip()
                else:
                    address = link.get_text(strip=True)

                afs_img = pick_image(card, BASE)
                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'area':          detect_area(address, settings['area_mappings'], settings['city']),
                    'external_url':  ext_url,
                    'image_url':     afs_img,
                    'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                    'landlord_id':   'AccommodationForStudents',
                })
                added += 1

        print(f'  [AFS] page {page}: {added} new')
        if added == 0: break
        time.sleep(1.0)

    return results


def scrape_cardens(search_url, university_id, settings):
    """
    Cardens Estate Agents – Exeter specific agency.
    """
    if university_id != 'exeter':
        return []
        
    BASE  = 'https://www.cardensestateagents.co.uk'
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9,en;q=0.8',
        'Referer': 'https://www.google.com/',
    })
    
    results, seen = [], set()

    for page in range(1, 6):
        print(f'  [PAGE] Cardens page {page}')
        url  = search_url + (f'?page={page}' if page > 1 else '')
        if page > 1: time.sleep(1)

        try:
            r = session.get(url, timeout=20)
            if r.status_code != 200: break
            soup = BeautifulSoup(r.text, 'html.parser')
        except: break

        cards = (soup.select('div.property-item, div.property-card, article.property') or
                 soup.find_all('a', href=re.compile(r'/property(?:ies)?/')))
        if not cards: break

        added = 0
        for card in cards:
            link = card if card.name == 'a' else card.find('a', href=True)
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url.endswith('/students') or ext_url in seen: continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            if '£' not in text: continue

            bm   = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
            beds = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else 0)

            price_raw = 0
            unit = None
            pm_val = re.search(r'£([\d,]+)', text)
            if pm_val:
                price_raw = float(pm_val.group(1).replace(',', ''))
                if 'pppw' in text.lower() or 'per person per week' in text.lower(): unit = 'pppw'
                elif 'pw' in text.lower() or 'per week' in text.lower(): unit = 'pppw_property'
                elif 'pcm' in text.lower(): unit = 'ppm_property'
            
            if not unit: continue
            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'Cardens')
            if price_pppw is None: continue

            h = card.find(['h2', 'h3', 'h4'])
            address = h.get_text(strip=True) if h else ''
            img = pick_image(card, BASE)

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     1,
                'area':          detect_area(address, settings['area_mappings'], settings['city']),
                'external_url':  ext_url,
                'image_url':     img,
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'Cardens',
            })
            added += 1
        if added == 0: break
    return results


def scrape_rightmove(search_url, university_id, settings):
    """
    Rightmove – student accommodation section.
    """
    BASE = 'https://www.rightmove.co.uk'
    results, seen = [], set()

    for page_idx in range(0, 10):
        index = page_idx * 25
        print(f'  [PAGE] Rightmove page {page_idx + 1}')
        url   = search_url + (f'?index={index}' if index else '')
        soup, _ = get_page(url)
        if not soup: break

        added = 0
        nd_script = soup.find('script', id='__NEXT_DATA__')
        model = {}
        if nd_script:
            try:
                nd = json.loads(nd_script.string or '{}')
                model = nd.get('props', {}).get('pageProps', {}).get('searchResults', {})
            except: pass

        for prop in model.get('properties', []):
            pid = prop.get('id')
            if not pid: continue
            ext_url = f'{BASE}/properties/{pid}#/?channel=STU_LET'
            if ext_url in seen: continue
            seen.add(ext_url)

            price_info = prop.get('price', {})
            amount = float(price_info.get('amount') or 0)
            freq = str(price_info.get('frequency', '')).lower()
            qualifier = str(prop.get('displayPriceQualifier', '')).lower()
            beds = max(1, int(prop.get('bedrooms') or 1))

            unit = None
            if 'weekly' in freq:
                unit = 'pppw' if 'per person' in qualifier else 'pppw_property'
            elif 'monthly' in freq:
                unit = 'pppm' if 'per person' in qualifier else 'ppm_property'
            
            if not unit: continue
            price_pppw = calculate_pppw(amount, unit, beds, ext_url, 'Rightmove')
            if price_pppw is None: continue

            display_addr = str(prop.get('displayAddress') or '')
            address = re.sub(fr',?\s*{settings["city"]}.*$', '', display_addr, flags=re.I).strip()
            
            img_info = prop.get('propertyImages', {})
            imgs = img_info.get('images', [])
            img = img_info.get('mainImageSrc') or (imgs[0].get('srcUrl') if imgs else None)

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     max(1, int(prop.get('bathrooms') or 1)),
                'area':          detect_area(address, settings['area_mappings'], settings['city']),
                'external_url':  ext_url,
                'image_url':     img,
                'landlord_id':   'Rightmove',
            })
            added += 1

        if added == 0:
            for link in soup.find_all('a', href=re.compile(r'/properties/\d+')):
                pid = re.search(r'/properties/(\d+)', link['href']).group(1)
                ext_url = f'{BASE}/properties/{pid}#/?channel=STU_LET'
                if ext_url in seen: continue
                seen.add(ext_url)
                
                card = link.find_parent(['div', 'article']) or link
                text = card.get_text(' ')
                pm = re.search(r'£([\d,]+)', text)
                if not pm: continue
                price_raw = float(pm.group(1).replace(',', ''))
                bm = re.search(r'(\d+)\s+bed', text, re.I)
                beds = int(bm.group(1)) if bm else 1
                
                price_pppw = calculate_pppw(price_raw, 'pppw_property', beds, ext_url, 'Rightmove')
                if price_pppw:
                    results.append({
                        'address':       link.get_text(strip=True),
                        'price_pppw':    price_pppw,
                        'bedrooms':      beds,
                        'bathrooms':     1,
                        'area':          detect_area(link.get_text(), settings['area_mappings'], settings['city']),
                        'external_url':  ext_url,
                        'image_url':     pick_image(card, BASE),
                        'landlord_id':   'Rightmove',
                    })
                    added += 1

        print(f'  [Rightmove] page {page_idx + 1}: {added} new')
        if added == 0: break
        time.sleep(1)
    return results


def scrape_rsj(search_url, university_id, settings):
    if university_id != 'exeter': return []
    BASE = "https://rsjinvestments.com"
    results, seen = [], set()
    for page in range(1, 10):
        url = f"{BASE}/property_tag/exeter/" + (f"page/{page}/" if page > 1 else "")
        soup, _ = get_page(url)
        if not soup: break
        
        # RSJ uses different classes for properties
        cards = soup.select('div.rem_property, .rem-property-box, [id^="post-"]')
        if not cards: break
        
        added = 0
        for card in cards:
            link = card.select_one('h2 a, .property-title a, a[href*="/property/"]')
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if '/property/' not in ext_url or ext_url in seen: continue
            seen.add(ext_url)
            
            text = card.get_text(' ')
            
            price_tag = card.select_one('.rem-price-amount, .price, .amount')
            price_raw = 0
            if price_tag:
                try:
                    price_raw = float(re.sub(r'[^\d.]', '', price_tag.text))
                except: pass
            
            if not price_raw:
                pm = re.search(r'£\s*([\d,.]+)', text)
                if pm: price_raw = float(pm.group(1).replace(',', ''))
            
            bed_tag = card.find('span', title=re.compile(r'Bed', re.I)) or card.select_one('.beds, .bedrooms')
            beds = 1
            if bed_tag:
                m_beds = re.search(r'\d+', bed_tag.text)
                if m_beds: beds = int(m_beds.group())
            
            address = link.text.strip()
            addr_tag = card.select_one('.address-text, .location, .address')
            if addr_tag: address = addr_tag.text.strip()

            results.append({
                'address': address,
                'price_pppw': price_raw,
                'bedrooms': beds,
                'bathrooms': 1,
                'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
                'external_url': ext_url,
                'image_url': pick_image(card, BASE),
                'landlord_id': 'RSJInvestments',
            })
            added += 1
        if added == 0: break
        time.sleep(1)
    return results


def scrape_star(search_url, university_id, settings):
    if university_id != 'exeter': return []
    BASE = "https://star-students.com"
    results, seen = [], set()
    
    # Try multiple common student search URLs if the provided one fails
    urls = [search_url, f"{BASE}/property-to-rent", f"{BASE}/student-accommodation-exeter"]
    
    for url in urls:
        soup, _ = get_page(url)
        if not soup: continue
        
        cards = soup.select('div.card, .property-item, .listing-item')
        if not cards: continue
        
        added = 0
        for card in cards:
            link = card.select_one('a[href*="/property/"], a.card-image-container')
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url in seen: continue
            seen.add(ext_url)
            
            text = card.get_text(' ')
            if 'let' in text.lower() and 'let agreed' in text.lower(): continue
                
            price_tag = card.select_one('.price-value, .price, .amount')
            price_raw = 0
            if price_tag:
                try: price_raw = float(re.sub(r'[^\d.]', '', price_tag.text))
                except: pass
            
            beds = 1
            bed_icon = card.select_one('i.fa-bed, .fa-bed')
            if bed_icon:
                beds_text = bed_icon.find_next_sibling('span')
                if beds_text: 
                    m = re.search(r'\d+', beds_text.text)
                    if m: beds = int(m.group())
            
            content = card.select_one('.card-content, .property-details')
            address = "Exeter"
            if content:
                addr_link = content.select_one('a, .title')
                if addr_link: address = addr_link.text.strip()
            
            results.append({
                'address': address,
                'price_pppw': price_raw,
                'bedrooms': beds,
                'bathrooms': 1,
                'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
                'external_url': ext_url,
                'image_url': pick_image(card, BASE),
                'landlord_id': 'StarStudents',
                'bills_included': 'bill' in text.lower()
            })
            added += 1
        if added > 0: break # Found a working page
        
    return results


def scrape_gillams(search_url, university_id, settings):
    if university_id != 'exeter': return []
    BASE = "https://www.gillams-properties.co.uk"
    results, seen = [], set()
    
    # Try a few variations of the URL
    urls = [search_url, f"{BASE}/student-houses/exeter"]
    
    for url in urls:
        soup, _ = get_page(url)
        if not soup: continue
        
        cards = soup.select('article, .property-card, .ssr-property-card')
        if not cards: continue
            
        added = 0
        for card in cards:
            link = card.select_one('a[href*="/property/"], .ssr-card-title a')
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url in seen: continue
            seen.add(ext_url)
                
            text = card.get_text(' ')
            if 'let agreed' in text.lower(): continue
                
            price_tag = card.select_one('.ssr-card-price, .price, .amount')
            price_raw = 0
            if price_tag:
                m_price = re.search(r'£([\d.]+)', price_tag.text)
                if m_price: price_raw = float(m_price.group(1))
            
            meta = card.select_one('.ssr-card-meta, .meta, .details')
            beds = 1
            if meta:
                m_beds = re.search(r'(\d+)\s+bed', meta.text, re.I)
                if m_beds: beds = int(m_beds.group(1))
            
            address = link.text.strip()
            if ' - ' in address: address = address.split(' - ')[-1]

            results.append({
                'address': address,
                'price_pppw': price_raw,
                'bedrooms': beds,
                'bathrooms': 1,
                'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
                'external_url': ext_url,
                'image_url': pick_image(card, BASE),
                'landlord_id': 'Gillams',
                'bills_included': 'inclusive' in text.lower()
            })
            added += 1
        if added > 0: break
        
    return results


def scrape_uwestudentpad(search_url, university_id, settings):
    BASE = 'https://www.uwestudentpad.co.uk'
    results, seen = [], set()
    for page in range(1, 6):
        url = f"{BASE}/SearchResults/{page}"
        soup, _ = get_page(url)
        if not soup: break
        
        # UWE Studentpad uses .search-result or .property-item depending on version
        cards = soup.select('.search-result, .property-item, [id^="property-"]')
        if not cards: break
        
        added = 0
        for card in cards:
            link = card.select_one('a[href*="/Property/"], a.property-title')
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url in seen: continue
            seen.add(ext_url)
            
            text = card.get_text(' ')
            
            # Price extraction
            price_raw = 0
            pm = re.search(r'£\s*([\d,]+)', text)
            if pm:
                price_raw = float(pm.group(1).replace(',', ''))
            else: continue
            
            unit = 'pppw' if 'pppw' in text.lower() or 'per person' in text.lower() else 'pppw_property'
            
            # Beds
            bm = re.search(r'(\d+)\s+bed', text, re.I)
            beds = int(bm.group(1)) if bm else 1
            
            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'UWEStudentPad')
            if not price_pppw: continue
            
            address = link.text.strip()
            if not address or len(address) < 5:
                # Try finding address in sub-elements
                addr_el = card.select_one('.address, .location')
                if addr_el: address = addr_el.text.strip()

            results.append({
                'address': address,
                'price_pppw': price_pppw,
                'bedrooms': beds,
                'bathrooms': 1,
                'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
                'external_url': ext_url,
                'image_url': pick_image(card, BASE),
                'landlord_id': 'UWEStudentPad',
            })
            added += 1
        if added == 0: break
    return results


def scrape_bristolsul_lettings(search_url, university_id, settings):
    BASE = 'https://www.bristolsulettings.co.uk'
    results = []
    soup, _ = get_page(search_url)
    if not soup: return []
    
    # Bristol SU uses different cards, try several selectors
    cards = soup.select('.property-item, .property-card, .listing-item')
    if not cards:
        # Fallback to links if containers aren't found
        cards = soup.find_all('a', href=re.compile(r'/properties/'))
        
    for card in cards:
        link = card if card.name == 'a' else card.select_one('a[href*="/properties/"]')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        
        text = card.get_text(' ')
        pm = re.search(r'£\s*([\d,]+)', text)
        if not pm: continue
        price_raw = float(pm.group(1).replace(',', ''))
        
        bm = re.search(r'(\d+)\s+bed', text, re.I)
        beds = int(bm.group(1)) if bm else 1
        
        price_pppw = calculate_pppw(price_raw, 'pppw', beds, ext_url, 'BristolSULettings')
        if not price_pppw: continue
        
        address = link.text.strip()
        if not address or len(address) < 5:
            addr_el = card.select_one('.address, .title')
            if addr_el: address = addr_el.text.strip()

        results.append({
            'address': address,
            'price_pppw': price_pppw,
            'bedrooms': beds,
            'bathrooms': 1,
            'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
            'external_url': ext_url,
            'image_url': pick_image(card, BASE),
            'landlord_id': 'BristolSULettings',
        })
    return results


def scrape_cjhole(search_url, university_id, settings):
    BASE = 'https://www.cjhole.co.uk'
    results = []
    soup, _ = get_page(search_url)
    if not soup: return []
    
    # CJ Hole uses .property-item, .property-card, or search-result-item
    cards = soup.select('.property-item, .property-card, .search-result-item')
    if not cards:
        cards = soup.find_all('div', class_=re.compile(r'property', re.I))
        
    for card in cards:
        link = card.select_one('a[href*="/property/"], a[href*="/letting/"]')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        
        text = card.get_text(' ')
        pm = re.search(r'£\s*([\d,]+)', text)
        if not pm: continue
        price_raw = float(pm.group(1).replace(',', ''))
        
        # CJ Hole usually lists pcm
        unit = 'pppm' if 'pcm' in text.lower() or 'month' in text.lower() else 'pppw'
        
        bm = re.search(r'(\d+)\s+bed', text, re.I)
        beds = int(bm.group(1)) if bm else 1
        
        price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'CJHole')
        if not price_pppw: continue
        
        address = link.text.strip()
        if not address or len(address) < 5:
            addr_el = card.select_one('.address, .location, h2, h3')
            if addr_el: address = addr_el.text.strip()

        results.append({
            'address': address,
            'price_pppw': price_pppw,
            'bedrooms': beds,
            'bathrooms': 1,
            'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
            'external_url': ext_url,
            'image_url': pick_image(card, BASE),
            'landlord_id': 'CJHole',
        })
    return results


def scrape_bristoldigs(search_url, university_id, settings):
    BASE = 'https://bristoldigs.co.uk'
    results = []
    soup, _ = get_page(search_url)
    if not soup: return []
    for card in soup.select('.property-item'):
        link = card.select_one('a.property-link')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        price_raw = float(re.search(r'£([\d,]+)', card.select_one('.price').text).group(1).replace(',', ''))
        beds = int(re.search(r'\d+', card.select_one('.beds').text).group())
        
        price_pppw = calculate_pppw(price_raw, 'pppw', beds, ext_url, 'BristolDigs')
        if not price_pppw: continue
        
        results.append({
            'address': card.select_one('.address').text.strip(),
            'price_pppw': price_pppw,
            'bedrooms': beds,
            'bathrooms': 1,
            'area': detect_area(card.select_one('.address').text, settings['area_mappings'], settings['city']),
            'external_url': ext_url,
            'image_url': pick_image(card, BASE),
            'landlord_id': 'BristolDigs',
        })
    return results


def scrape_studentcrowd(search_url, university_id, settings):
    BASE = 'https://www.studentcrowd.com'
    results = []
    soup, _ = get_page(search_url)
    if not soup: return []
    
    # StudentCrowd uses various card layouts
    cards = soup.select('.property-card, .search-result, [class*="PropertyCard"]')
    if not cards:
        cards = soup.find_all('div', class_=re.compile(r'card', re.I))

    for card in cards:
        link = card.select_one('a[href*="/student-accommodation-"]')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        
        text = card.get_text(' ')
        pm = re.search(r'£\s*([\d,]+)', text)
        if not pm: continue
        price_raw = float(pm.group(1).replace(',', ''))
        
        price_pppw = calculate_pppw(price_raw, 'pppw', 1, ext_url, 'StudentCrowd')
        if not price_pppw: continue
        
        address = card.select_one('.title, .name, h2, h3').text.strip() if card.select_one('.title, .name, h2, h3') else settings['city']

        results.append({
            'address': address,
            'price_pppw': price_pppw,
            'bedrooms': 1,
            'bathrooms': 1,
            'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
            'external_url': ext_url,
            'image_url': pick_image(card, BASE),
            'landlord_id': 'StudentCrowd',
        })
    return results


def scrape_everystudent(search_url, university_id, settings):
    BASE = 'https://everystudent.co.uk'
    results, seen = [], set()

    for page in range(1, 8):
        url = search_url.rstrip('/') + (f'/page/{page}/' if page > 1 else '/')
        soup, _ = get_page(url)
        if not soup: break

        cards = soup.select('.property, .listing-item, article.type-property, article.post')
        if not cards:
            cards = soup.find_all(['article', 'div'], class_=re.compile(r'property|listing|accommodation', re.I))
        if not cards: break

        added = 0
        for card in cards:
            link = card.select_one('a[href*="everystudent"]') or card.find('a', href=re.compile(r'/\d+|/property'))
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url in seen or ext_url.rstrip('/') == search_url.rstrip('/'):
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            pm = re.search(r'£\s*([\d,]+)', text)
            if not pm: continue
            price_raw = float(pm.group(1).replace(',', ''))

            unit = 'ppm_property' if re.search(r'pcm|per.?month', text, re.I) else 'pppw'
            bm = re.search(r'(\d+)\s*bed', text, re.I)
            beds = int(bm.group(1)) if bm else 1

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'EveryStudent')
            if not price_pppw: continue

            h = card.select_one('h2, h3, h4, .entry-title, .property-title')
            address = h.get_text(strip=True) if h else settings['city']

            results.append({
                'address':       address,
                'price_pppw':    price_pppw,
                'bedrooms':      beds,
                'bathrooms':     1,
                'area':          detect_area(address + ' ' + text, settings['area_mappings'], settings['city']),
                'external_url':  ext_url,
                'image_url':     pick_image(card, BASE),
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'EveryStudent',
            })
            added += 1

        print(f'  [EveryStudent] page {page}: {added} new')
        if added == 0: break
        time.sleep(1)

    return results


def scrape_amberstudent(search_url, university_id, settings):
    BASE = 'https://amberstudent.com'
    results, seen = [], set()

    soup, _ = get_page(search_url)
    if not soup: return []

    # AmberStudent is a Next.js SPA — try __NEXT_DATA__ first
    nd_script = soup.find('script', id='__NEXT_DATA__')
    if nd_script:
        try:
            nd = json.loads(nd_script.string or '{}')
            page_props = nd.get('props', {}).get('pageProps', {})

            def _find_list(obj, depth=0):
                if depth > 6: return []
                if isinstance(obj, list) and len(obj) > 0:
                    if isinstance(obj[0], dict) and any(k in obj[0] for k in ('name', 'title', 'slug', 'price', 'rent')):
                        return obj
                if isinstance(obj, dict):
                    for v in obj.values():
                        found = _find_list(v, depth + 1)
                        if found: return found
                return []

            listings = _find_list(page_props)
            for prop in listings:
                if not isinstance(prop, dict): continue
                slug = prop.get('slug') or prop.get('id') or ''
                ext_url = f"{BASE}/places/{slug}" if slug else ''
                if not ext_url or ext_url in seen: continue
                seen.add(ext_url)

                name = prop.get('name') or prop.get('title') or prop.get('address') or settings['city']
                price_raw = float(prop.get('price') or prop.get('min_price') or prop.get('rent') or 0)
                if not price_raw: continue
                beds = max(1, int(prop.get('bedrooms') or prop.get('beds') or 1))
                blob = str(prop).lower()
                unit = 'pppw' if 'week' in blob else 'pppm'

                price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'AmberStudent')
                if not price_pppw: continue

                results.append({
                    'address':       name,
                    'price_pppw':    price_pppw,
                    'bedrooms':      beds,
                    'bathrooms':     1,
                    'area':          detect_area(name, settings['area_mappings'], settings['city']),
                    'external_url':  ext_url,
                    'image_url':     prop.get('image') or prop.get('thumbnail') or None,
                    'bills_included': bool(prop.get('bills_included') or 'bill' in blob),
                    'landlord_id':   'AmberStudent',
                })
        except Exception as e:
            print(f'  [AmberStudent] NEXT_DATA error: {e}')

    # HTML fallback for card-based layouts
    if not results:
        for card in soup.select('[class*="PropertyCard"], [class*="property-card"], [data-testid*="property"]'):
            link = card.select_one(f'a[href*="/places/"]')
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url in seen: continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            pm = re.search(r'£\s*([\d,]+)', text)
            if not pm: continue
            price_raw = float(pm.group(1).replace(',', ''))
            unit = 'pppm' if re.search(r'month|pcm', text, re.I) else 'pppw'
            price_pppw = calculate_pppw(price_raw, unit, 1, ext_url, 'AmberStudent')
            if not price_pppw: continue

            h = card.select_one('h2, h3, h4, [class*="name"], [class*="title"]')
            address = h.get_text(strip=True) if h else settings['city']

            results.append({
                'address':       address,
                'price_pppw':    price_pppw,
                'bedrooms':      1,
                'bathrooms':     1,
                'area':          detect_area(address, settings['area_mappings'], settings['city']),
                'external_url':  ext_url,
                'image_url':     pick_image(card, BASE),
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':   'AmberStudent',
            })

    print(f'  [AmberStudent] {len(results)} listings found')
    return results


def scrape_studnofee(search_url, university_id, settings):
    BASE = 'https://www.studnofee.com'
    results, seen = [], set()

    for page in range(1, 10):
        url = search_url.rstrip('/') + (f'/page/{page}/' if page > 1 else '/')
        soup, _ = get_page(url)
        if not soup: break

        cards = soup.select(
            'article.property, .property-listing, .property-item, '
            '.listing-item, [class*="property-card"], [class*="listing"]'
        )
        if not cards:
            cards = soup.find_all(['article', 'div'], class_=re.compile(r'property|listing', re.I))
        if not cards: break

        added = 0
        for card in cards:
            link = (card if card.name == 'a' else
                    card.select_one('a[href*="/property"], a[href*="/properties"], a.property-link, h2 a, h3 a'))
            if not link: continue
            href = link.get('href', '')
            ext_url = urljoin(BASE, href).split('?')[0]
            if ext_url in seen or ext_url.rstrip('/') == search_url.rstrip('/'):
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            pm = re.search(r'£\s*([\d,]+(?:\.\d+)?)', text)
            if not pm: continue
            price_raw = float(pm.group(1).replace(',', ''))

            unit = 'ppm_property' if re.search(r'pcm|per.?month', text, re.I) else 'pppw'
            bm = re.search(r'(\d+)\s*bed', text, re.I)
            beds = int(bm.group(1)) if bm else 1

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'StudNoFee')
            if not price_pppw: continue

            h = card.select_one('h2, h3, h4, .property-title, .listing-title')
            address = h.get_text(strip=True) if h else settings['city']

            results.append({
                'address':        address,
                'price_pppw':     price_pppw,
                'bedrooms':       beds,
                'bathrooms':      1,
                'area':           detect_area(address + ' ' + text, settings['area_mappings'], settings['city']),
                'external_url':   ext_url,
                'image_url':      pick_image(card, BASE),
                'bills_included': bool(re.search(r'bills?\s+inclu|no.?fee', text, re.I)),
                'landlord_id':    'StudNoFee',
            })
            added += 1

        print(f'  [StudNoFee] page {page}: {added} new')
        if added == 0: break
        time.sleep(1)

    return results


def scrape_istudentlets(search_url, university_id, settings):
    BASE = 'https://www.istudentlets.com'
    results, seen = [], set()

    # iStudentLets uses a slug-based URL. Swap in page number before the last segment.
    # Pattern: /search/0_location-ANY/rent_00.00-99.99/rooms_0-9[/page/N]
    for page in range(1, 10):
        url = search_url.rstrip('/') + (f'/page/{page}' if page > 1 else '')
        soup, _ = get_page(url)
        if not soup: break

        cards = soup.select(
            '.property-listing, .search-result, .property-item, '
            '[class*="property"], [class*="listing-card"]'
        )
        if not cards:
            cards = soup.find_all(['div', 'article'], class_=re.compile(r'property|listing|result', re.I))
        if not cards: break

        added = 0
        for card in cards:
            link = (card.select_one('a[href*="/property/"], a[href*="/student-lets/"], h2 a, h3 a')
                    or (card if card.name == 'a' else None))
            if not link: continue
            ext_url = urljoin(BASE, link.get('href', '')).split('?')[0]
            if '/search' in ext_url or ext_url in seen: continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            pm = re.search(r'£\s*([\d,]+(?:\.\d+)?)', text)
            if not pm: continue
            price_raw = float(pm.group(1).replace(',', ''))

            # iStudentLets typically shows pppw for HMOs, pppm for some studios
            unit = 'ppm_property' if re.search(r'pcm|per.?month', text, re.I) else 'pppw'
            bm = re.search(r'(\d+)\s*bed', text, re.I)
            beds = int(bm.group(1)) if bm else 1

            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'iStudentLets')
            if not price_pppw: continue

            h = card.select_one('h2, h3, h4, .property-address, .address, .title')
            address = h.get_text(strip=True) if h else settings['city']

            btm = re.search(r'(\d+)\s*bath', text, re.I)
            baths = min(int(btm.group(1)), beds) if (btm and beds > 0) else 1

            results.append({
                'address':        address,
                'price_pppw':     price_pppw,
                'bedrooms':       beds,
                'bathrooms':      baths,
                'area':           detect_area(address + ' ' + text, settings['area_mappings'], settings['city']),
                'external_url':   ext_url,
                'image_url':      pick_image(card, BASE),
                'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                'landlord_id':    'iStudentLets',
            })
            added += 1

        print(f'  [iStudentLets] page {page}: {added} new')
        if added == 0: break
        time.sleep(1)

    return results


def scrape_jointliving(search_url, university_id, settings):
    BASE = 'https://jointliving.co.uk'
    results = []
    soup, _ = get_page(search_url)
    if not soup: return []
    
    cards = soup.select('.property-card, .listing, article')
    if not cards:
        cards = soup.find_all('div', class_=re.compile(r'property', re.I))

    for card in cards:
        link = card if card.name == 'a' else card.select_one('a')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        if '/cities/' in ext_url: continue
        
        text = card.get_text(' ')
        pm = re.search(r'£\s*([\d,]+)', text)
        if not pm: continue
        price_raw = float(pm.group(1).replace(',', ''))
        
        price_pppw = calculate_pppw(price_raw, 'pppw', 1, ext_url, 'JointLiving')
        if not price_pppw: continue
        
        addr_el = card.select_one('.address, .title, h2, h3')
        address = addr_el.text.strip() if addr_el else "Bristol"
        
        results.append({
            'address': address,
            'price_pppw': price_pppw,
            'bedrooms': 1,
            'bathrooms': 1,
            'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
            'external_url': ext_url,
            'image_url': pick_image(card, BASE),
            'landlord_id': 'JointLiving',
        })
    return results


def scrape_unitestudents(search_url, university_id, settings):
    BASE = 'https://www.unitestudents.com'
    results = []
    # Unite often needs specific headers or loads via JSON, but we'll try robust HTML first
    soup, _ = get_page(search_url)
    if not soup: return []
    
    cards = soup.select('.property-card, .search-result-card, [data-testid="property-card"]')
    if not cards:
        cards = soup.find_all('div', class_=re.compile(r'property', re.I))

    for card in cards:
        link = card.select_one('a[href*="/bristol/"]')
        if not link: continue
        ext_url = urljoin(BASE, link['href'])
        
        text = card.get_text(' ')
        pm = re.search(r'£\s*([\d,]+)', text)
        if not pm: continue
        price_raw = float(pm.group(1).replace(',', ''))
        
        price_pppw = calculate_pppw(price_raw, 'pppw', 1, ext_url, 'UniteStudents')
        if not price_pppw: continue
        
        title_el = card.select_one('.title, h2, h3, [class*="PropertyName"]')
        address = title_el.text.strip() if title_el else "Unite Students Bristol"
        
        results.append({
            'address': address,
            'price_pppw': price_pppw,
            'bedrooms': 1,
            'bathrooms': 1,
            'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
            'external_url': ext_url,
            'image_url': pick_image(card, BASE),
            'landlord_id': 'UniteStudents',
        })
    return results


def scrape_onthemarket(search_url, university_id, settings):
    """
    OnTheMarket scraper for student properties.
    """
    results, seen = [], set()
    BASE = 'https://www.onthemarket.com'

    for page in range(1, 4):
        url = search_url + (f'?page={page}' if page > 1 else '')
        soup, _ = get_page(url)
        if not soup: break
        
        cards = soup.select('.otm-PropertyCard, .property-card, li.result')
        if not cards: break
        
        added = 0
        for card in cards:
            link = card.select_one('a[href*="/details/"]')
            if not link: continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
            if ext_url in seen: continue
            seen.add(ext_url)
            
            text = card.get_text(' ')
            
            price_raw = 0
            pm = re.search(r'£\s*([\d,]+)', text)
            if pm:
                price_raw = float(pm.group(1).replace(',', ''))
            else: continue
            
            unit = 'pppm' if 'pcm' in text.lower() or 'month' in text.lower() else 'pppw'
            
            bm = re.search(r'(\d+)\s+bed', text, re.I)
            beds = int(bm.group(1)) if bm else 1
            
            price_pppw = calculate_pppw(price_raw, unit, beds, ext_url, 'OnTheMarket')
            if not price_pppw: continue
            
            address = "Property"
            addr_el = card.select_one('.address, .otm-PropertyAddress, address')
            if addr_el: address = addr_el.text.strip()
            
            results.append({
                'address': address,
                'price_pppw': price_pppw,
                'bedrooms': beds,
                'bathrooms': 1,
                'area': detect_area(address + " " + text, settings['area_mappings'], settings['city']),
                'external_url': ext_url,
                'image_url': pick_image(card, BASE),
                'landlord_id': 'OnTheMarket',
            })
            added += 1
        if added == 0: break
        time.sleep(1)
    return results


# ─── DEDUPLICATION ────────────────────────────────────────────────────────────

def deduplicate(listings):
    """
    Deduplicate with aggressive address normalization.
    """
    def completeness(l):
        score = 0
        if l.get('image_url'):                 score += 2
        if l.get('bills_included'):            score += 1
        if l['bathrooms'] > 1:                score += 1
        if len(l['address'].split()) > 3:     score += 1
        return score

    def addr_key(l):
        # Remove common property identifiers for more aggressive matching
        a = l['address'].lower()
        a = re.sub(r'\b(flat|apartment|apt|unit|room|house|no\.|number|studio)\s*\d+[a-z]?\b', '', a)
        a = re.sub(r'[^a-z0-9]', '', a)
        return f"{a}_{l['bedrooms']}"

    # Pass 1: normalised URL
    by_url = {}
    for l in listings:
        key = normalize_url(l['external_url'])
        if key not in by_url:
            by_url[key] = l
        elif completeness(l) > completeness(by_url[key]):
            by_url[key] = l

    # Pass 2: Aggressive addr+beds+price
    by_addr = {}
    for l in by_url.values():
        key = addr_key(l)
        if key not in by_addr:
            by_addr[key] = l
        else:
            existing = by_addr[key]
            price_diff = abs(l['price_pppw'] - existing['price_pppw'])
            if price_diff <= 5: # Increased tolerance to £5 for portal variations
                if completeness(l) > completeness(existing):
                    by_addr[key] = l
            else:
                by_addr[f"{key}_{int(l['price_pppw'])}"] = l

    return list(by_addr.values())


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--university', default='exeter', help='University ID (e.g. exeter, bristol)')
    parser.add_argument('--scraper', default=None, help='Run only a specific scraper by name')
    args = parser.parse_args()
    
    university_id = args.university
    if university_id not in UNIVERSITY_SETTINGS:
        print(f"[FATAL] Unknown university: {university_id}")
        return
        
    settings = UNIVERSITY_SETTINGS[university_id]
    
    # Filter search_urls if --scraper is provided
    search_urls = settings['search_urls']
    if args.scraper:
        if args.scraper in search_urls:
            search_urls = {args.scraper: search_urls[args.scraper]}
            print(f"=== RUNNING SINGLE SCRAPER: {args.scraper} FOR {settings['city']} ===")
        else:
            print(f"[FATAL] Scraper {args.scraper} not found for {university_id}")
            return
    else:
        print(f"=== SCRAPING ALL FOR {settings['city']} ({university_id}) ===")

    SUPABASE_URL = (os.environ.get('SUPABASE_URL') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_URL'))
    SUPABASE_KEY = (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_ANON_KEY'))
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Scrapers ────────────────────────────────────────────────────────────
    stats = {}
    all_raw = []
    
    SCRAPER_MAP = {
        'UniHomes': scrape_unihomes,
        'StuRents': scrape_sturents,
        'AccommodationForStudents': scrape_accommodationforstudents,
        'Rightmove': scrape_rightmove,
        'OnTheMarket': scrape_onthemarket,
        'Cardens': scrape_cardens,
        'RSJInvestments': scrape_rsj,
        'StarStudents': scrape_star,
        'Gillams': scrape_gillams,
        'UWEStudentPad': scrape_uwestudentpad,
        'BristolSULettings': scrape_bristolsul_lettings,
        'CJHole': scrape_cjhole,
        'BristolDigs': scrape_bristoldigs,
        'StudentCrowd': scrape_studentcrowd,
        'EveryStudent': scrape_everystudent,
        'AmberStudent': scrape_amberstudent,
        'StudNoFee': scrape_studnofee,
        'iStudentLets': scrape_istudentlets,
        'JointLiving': scrape_jointliving,
        'UniteStudents': scrape_unitestudents,
    }

    for name, search_url in search_urls.items():
        if name not in SCRAPER_MAP:
            print(f"  [SKIP] No scraper function for {name}")
            continue
            
        fn = SCRAPER_MAP[name]
        print(f'\n=== {name} ===')
        stats[name] = {'raw': 0, 'price_filter': 0, 'bad_url': 0, 'bad_addr': 0, 'inserted': 0}
        try:
            raw = fn(search_url, university_id, settings)
            stats[name]['raw'] = len(raw)
            print(f'  → {len(raw)} raw listings')
            all_raw.extend(raw)
        except Exception as e:
            print(f'  [CRASH] {name}: {e}')
            import traceback
            traceback.print_exc()

    # ── Validate ─────────────────────────────────────────────────────────────
    valid = []
    for l in all_raw:
        ok, reason = validate(l, settings)
        landlord = l.get("landlord_id","?")
        if ok:
            valid.append(l)
        else:
            if 'price' in reason:
                stats[landlord]['price_filter'] += 1
            elif 'url' in reason:
                stats[landlord]['bad_url'] += 1
            elif 'address' in reason or 'GEO-SKIP' in reason:
                stats[landlord]['bad_addr'] += 1

    print(f'\nValidation: {len(all_raw)} raw → {len(valid)} valid')

    # ── Deduplicate ───────────────────────────────────────────────────────────
    unique = deduplicate(valid)
    print(f'Dedup:      {len(valid)} valid → {len(unique)} unique')

    # ── Upsert Properties ─────────────────────────────────────────────────────
    now      = datetime.now(timezone.utc).isoformat()
    upserted = 0
    total_to_upsert = len(unique)
    ref_coords = settings['coords']
    
    for i, l in enumerate(unique):
        if (i + 1) % 10 == 0 or i == 0 or i == total_to_upsert - 1:
            print(f"  → Progress: {i+1}/{total_to_upsert}...")
            
        pc_range = settings['postcode_range']
        postcode = extract_postcode(f"{l['address']} {l['external_url']}", pc_range)
        coords = get_coordinates(postcode, l['address'], settings['city'])
        
        row = {
            'address':       l['address'],
            'price_pppw':    l['price_pppw'],
            'bedrooms':      l['bedrooms'],
            'bathrooms':     l.get('bathrooms', 1),
            'available_from': l.get('available_from'),
            'area':          l.get('area') or detect_area(l['address'], settings['area_mappings'], settings['city']),
            'external_url':  l['external_url'],
            'image_url':     l['image_url'],
            'bills_included': l.get('bills_included', False),
            'landlord_id':   l['landlord_id'],
            'latitude':      coords[0] if coords else None,
            'longitude':     coords[1] if coords else None,
            'last_scraped':  now,
            'is_available':  True,
            'university':    university_id,
        }
        
        for c_name, c_val in ref_coords.items():
            dist = round(haversine(coords, c_val), 1) if coords else None
            row[f'distance_{c_name}'] = dist

        try:
            supabase.table('properties').upsert(row, on_conflict='external_url').execute()
            upserted += 1
            stats[l['landlord_id']]['inserted'] += 1
        except Exception as e:
            if "schema cache" in str(e):
                print(f"  [DB ERROR] Schema sync needed: {e}")
                break
            pass

    print(f'\nDone. {upserted} listings live for {university_id}.')


if __name__ == '__main__':
    main()
