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
    load_dotenv()
except ImportError:
    pass

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'
MIN_PPPW      = 100.0   # Minimum credible pppw for Exeter student housing
MAX_PPPW      = 300.0

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
        return False, f"price £{price:.0f} pppw outside £{MIN_PPPW:.0f}–£{MAX_PPPW:.0f}"
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
    # Marketing copy with pipe separator: "STUDENT ONLY | 51 WEEKS |"
    if '|' in addr:
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


# ─── SCRAPERS ────────────────────────────────────────────────────────────────

def scrape_unihomes():
    """
    UniHomes – Vue SPA with server-side-rendered HTML fallback.
    Cards   : <a href="/property/{id}/...">
    Price   : "£176 per person per week" (already pppw)
              "£165 per week"            (total pw → divide by beds)
    Pagination: ?page=N
    """
    BASE = 'https://www.unihomes.co.uk'
    results, seen = [], set()

    for page in range(1, 21):
        print(f'  [PAGE] UniHomes page {page}')
        url = f'{BASE}/student-accommodation/exeter' + (f'?page={page}' if page > 1 else '')
        soup, _ = get_page(url)
        if not soup:
            break

        # UniHomes now renders absolute hrefs (https://www.unihomes.co.uk/property/...)
        # as well as relative ones (/property/...) — match both.
        cards = soup.find_all('a', href=re.compile(r'(?:^|unihomes\.co\.uk)/property/\d+'))
        if not cards:
            print(f'  [UniHomes] page {page}: no cards – stopping')
            break

        added = 0
        for card in cards:
            href = card['href']
            # Normalise to absolute URL
            ext_url = (href if href.startswith('http') else f'{BASE}{href}').split('?')[0]
            
            # [BAD-URL] check: if extracted URL is just the search page
            if '/student-accommodation/exeter' in ext_url and '/property/' not in ext_url:
                print(f'  [BAD-URL] UniHomes: {ext_url}')
                continue

            if ext_url in seen:
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()

            # ── Price ────────────────────────────────────────────────────────
            m_pppw = re.search(r'£(\d+(?:\.\d+)?)\s+per\s+person\s+per\s+week', text, re.I)
            m_pw   = re.search(r'£(\d+(?:\.\d+)?)\s+per\s+week', text, re.I)
            if m_pppw:
                price_raw, is_total = float(m_pppw.group(1)), False
            elif m_pw:
                price_raw, is_total = float(m_pw.group(1)), True
            else:
                print(f'  [SKIP][UniHomes] no price: {ext_url}')
                continue

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
                print(f'  [SKIP][UniHomes] no beds: {ext_url}')
                continue

            price_pppw = price_raw / beds if is_total else price_raw
            conversion = f'£{price_raw}/property/week ÷ {beds}beds' if is_total else f'£{price_raw} pppw (direct)'
            print(f'  [UniHomes] price: {conversion} → pppw=£{price_pppw:.2f} | {ext_url}')

            # ── Baths ─────────────────────────────────────────────────────────
            m_baths = re.search(r'(\d+)\s+bathroom', text, re.I)
            baths   = min(int(m_baths.group(1)), beds) if m_baths else 1

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

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
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
    Price   : "£XXX pppw" in description/JSON text.
    Pagination: ?offset=N (12 per page).
    Falls back to HTML card scraping if JSON-LD yields nothing.
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

        # Strategy A: JSON-LD
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string or '[]')
            except Exception:
                continue
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get('@type') not in {
                        'Residence', 'Accommodation', 'House', 'Apartment', 'LodgingBusiness'}:
                    continue

                ext_url = item.get('url', '')
                if not ext_url:
                    continue
                if not ext_url.startswith('http'):
                    ext_url = urljoin(BASE, ext_url)
                
                # [BAD-URL] check
                if '/listings' in ext_url or '/search' in ext_url:
                    print(f'  [BAD-URL] StuRents: {ext_url}')
                    continue

                if ext_url in seen:
                    continue
                seen.add(ext_url)

                # ── Address (avoid using tenancy dates) ──────────────────────
                ao = item.get('address', {})
                if isinstance(ao, dict):
                    address = f"{ao.get('streetAddress','')} {ao.get('addressLocality','')}".strip()
                    # Strip locality-only results like " Exeter" or "Exeter" alone
                    if re.match(r'^exeter\b', address, re.I):
                        address = ''
                else:
                    address = str(ao).strip()
                    if is_date_str(address):
                        address = ''

                if not address:
                    name = item.get('name', '')
                    if not is_date_str(name):
                        address = name

                if not address:
                    address = _sturents_address_from_url(ext_url)

                if not address or is_date_str(address):
                    print(f'  [STURENTS-NAME-WARN] Could not extract real address, '
                          f'skipping: {ext_url}')
                    seen.discard(ext_url)
                    continue

                blob = json.dumps(item, ensure_ascii=False)
                pm = re.search(
                    r'£(\d+(?:\.\d+)?)\s*(?:pppw|per\s+person\s+per\s+week)', blob, re.I)
                if not pm:
                    print(f'  [SKIP][StuRents] no pppw in JSON-LD: {ext_url}')
                    continue
                price_pppw = float(pm.group(1))

                desc  = f"{item.get('description','')} {item.get('name','')}"
                bm    = re.search(r'(\d+)\s+bed(?:room)?', desc, re.I)
                beds  = int(bm.group(1)) if bm else 1
                if 'studio' in desc.lower():
                    beds = 1
                btm   = re.search(r'(\d+)\s+bathroom', desc, re.I)
                baths = min(int(btm.group(1)), beds) if btm else 1

                # ── Photo (filter out logo/generic URLs) ─────────────────────
                _PHOTO_SKIP = ('/logos/', '/logo/', 'placeholder', 'no-image',
                               'no_image', 'default', 'generic')
                img_raw = item.get('image', '')
                if isinstance(img_raw, list):
                    img_raw = img_raw[0] if img_raw else ''
                img_raw = str(img_raw)
                if (img_raw.startswith('http') and
                        not any(k in img_raw.lower() for k in _PHOTO_SKIP)):
                    img = img_raw
                else:
                    img = None
                    print(f'  [NO-PHOTO][StuRents] {ext_url}')

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     img,
                    'bills_included': bool(re.search(r'bills?\s+inclu', desc, re.I)),
                    'landlord_id':   'StuRents',
                })
                added += 1

        # Strategy B: HTML cards
        if added == 0:
            for card in soup.find_all(
                    ['div', 'article', 'li'],
                    class_=re.compile(r'listing|property|card|result', re.I)):
                text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
                if '£' not in text:
                    continue
                link = card.find('a', href=re.compile(r'/student-accommodation/exeter/'))
                if not link:
                    continue
                ext_url = urljoin(BASE, link['href']).split('?')[0]
                
                # [BAD-URL] check
                if '/listings' in ext_url or '/search' in ext_url:
                    print(f'  [BAD-URL] StuRents: {ext_url}')
                    continue

                if ext_url in seen:
                    continue
                seen.add(ext_url)

                pm = re.search(r'£(\d+)\s*pppw', text, re.I)
                if not pm:
                    print(f'  [SKIP][StuRents] no pppw in card: {ext_url}')
                    continue
                price_pppw = float(pm.group(1))

                bm    = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
                beds  = int(bm.group(1)) if bm else 1
                btm   = re.search(r'(\d+)\s+bathroom', text, re.I)
                baths = min(int(btm.group(1)), beds) if btm else 1

                h       = card.find(['h2', 'h3', 'h4'])
                address = h.get_text(strip=True) if h else ''
                if is_date_str(address) or not address:
                    # Try to find a real address in other elements
                    address = ''
                    for el in card.find_all(['p', 'span', 'div', 'address']):
                        txt = el.get_text(strip=True)
                        if (txt and not is_date_str(txt) and
                                re.search(
                                    r'\d+\s+\w+\s+'
                                    r'(?:Road|Street|Lane|Avenue|Close|Drive|Way|'
                                    r'Place|Gardens?|Terrace|Hill|Rise|Court)',
                                    txt, re.I)):
                            address = txt
                            break
                    # Last resort: slug from URL
                    if not address:
                        address = _sturents_address_from_url(ext_url)
                    if not address or is_date_str(address):
                        print(f'  [STURENTS-NAME-WARN] Could not extract real address '
                              f'from HTML card, skipping: {ext_url}')
                        seen.discard(ext_url)
                        continue

                img_url = pick_image(card, BASE)
                if not img_url:
                    print(f'  [NO-PHOTO][StuRents] {ext_url}')

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     img_url,
                    'bills_included': bool(re.search(r'bills?\s+inclu', text, re.I)),
                    'landlord_id':   'StuRents',
                })
                added += 1

        print(f'  [StuRents] offset {offset}: {added} new')
        if added == 0:
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

                    price_raw = (prop.get('price') or prop.get('weeklyPrice') or
                                 prop.get('pricePerWeek') or 0)
                    try:
                        price_raw_f = float(
                            str(price_raw).replace('£', '').replace(',', '').split()[0])
                    except Exception:
                        continue
                    if price_raw_f == 0:
                        continue

                    # AFS typically exposes pppw. If the value is implausibly high
                    # (> MAX_PPPW) it is likely monthly pppw – attempt conversion.
                    if price_raw_f > MAX_PPPW:
                        price_pppw = price_raw_f / 4.33
                        print(f'  [AFS] raw price £{price_raw_f} > MAX → treating as monthly, '
                              f'÷4.33 → pppw=£{price_pppw:.2f}')
                    else:
                        price_pppw = price_raw_f
                        print(f'  [AFS] raw price £{price_raw_f} → pppw=£{price_pppw:.2f} (direct)')
                    price_pppw = round(price_pppw, 2)

                    beds  = max(1, int(prop.get('bedrooms') or prop.get('beds') or 1))
                    baths = max(1, int(prop.get('bathrooms') or prop.get('baths') or 1))
                    baths = min(baths, beds)

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

                    results.append({
                        'address':       address,
                        'price_pppw':    round(price_pppw, 2),
                        'bedrooms':      beds,
                        'bathrooms':     baths,
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

                # AFS price is per person per week; card format: "£ 215 /week" (spaces)
                pm = re.search(r'£\s*(\d+(?:\.\d+)?)\s*(?:/\s*week|per\s+week)', text, re.I)
                if not pm:
                    print(f'  [SKIP][AFS] no price: {ext_url}')
                    continue
                price_pppw = float(pm.group(1))

                bm    = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
                beds  = int(bm.group(1)) if bm else 1
                if 'studio' in text.lower():
                    beds = 1
                btm   = re.search(r'(\d+)\s+bathroom', text, re.I)
                baths = min(int(btm.group(1)), beds) if btm else 1

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

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
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
    Cardens Estate Agents – may return 403; handled gracefully.
    Price: pcm → (pcm × 12 / 52) / beds = pppw
           pw  → pw / beds = pppw
    Pagination: ?page=N
    """
    BASE  = 'https://www.cardensestateagents.co.uk'
    # Step 5: Fix Cardens 403 by using a session and better headers
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    })
    
    results, seen = [], set()

    for page in range(1, 21):
        print(f'  [PAGE] Cardens page {page}')
        url  = f'{BASE}/students' + (f'?page={page}' if page > 1 else '')
        
        # Random delay between 1-3 seconds to avoid 403
        if page > 1:
            time.sleep(1 + 2 * (time.time() % 1))

        try:
            r = session.get(url, timeout=20)
            if r.status_code != 200:
                print(f'  [HTTP {r.status_code}] Cardens: {url}')
                if r.status_code == 403:
                    if 'cloudflare' in r.text.lower():
                        print('  [Cardens] Blocked by Cloudflare – dropping')
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
            
            # [BAD-URL] check
            if ext_url.endswith('/students') or '?page=' in ext_url:
                print(f'  [BAD-URL] Cardens: {ext_url}')
                continue

            if ext_url in seen:
                continue
            seen.add(ext_url)

            text = re.sub(r'\s+', ' ', container.get_text(' ')).strip()
            if '£' not in text:
                continue

            bm   = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
            beds = int(bm.group(1)) if bm else (1 if 'studio' in text.lower() else None)
            if not beds:
                print(f'  [SKIP][Cardens] no beds: {ext_url}')
                continue

            pm_pw  = re.search(r'£([\d,]+)\s*(?:pw|per\s+week)', text, re.I)
            pm_pcm = re.search(r'£([\d,]+)\s*(?:pcm|per\s+(?:calendar\s+)?month)', text, re.I)
            if pm_pw:
                price_pppw = float(pm_pw.group(1).replace(',', '')) / beds
            elif pm_pcm:
                price_pppw = float(pm_pcm.group(1).replace(',', '')) * 12 / 52 / beds
            else:
                print(f'  [SKIP][Cardens] no price: {ext_url}')
                continue

            btm   = re.search(r'(\d+)\s+bathroom', text, re.I)
            baths = min(int(btm.group(1)), beds) if btm else 1

            h       = container.find(['h2', 'h3', 'h4'])
            address = h.get_text(strip=True) if h else ''

            cardens_img = pick_image(container, BASE)
            if not cardens_img:
                print(f'  [NO-PHOTO][Cardens] {ext_url}')

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
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
                beds       = max(1, int(prop.get('bedrooms') or 1))
                baths      = max(1, int(prop.get('bathrooms') or 1))
                baths      = min(baths, beds)

                if 'month' in freq or 'pcm' in freq:
                    price_pppw = (amount * 12 / 52) / beds
                elif 'week' in freq or 'pw' in freq:
                    price_pppw = amount / beds
                else:
                    # Heuristic: total monthly rents for Exeter HMOs typically £800+.
                    # Weekly total for a 6-bed at £120pppw = £720 → use 800 as threshold
                    # to avoid misclassifying high weekly totals as monthly.
                    price_pppw = (amount * 12 / 52 / beds) if amount > 800 else (amount / beds)
                print(f'  [Rightmove] pid={pid} raw={amount} freq={freq!r} beds={beds} '
                      f'→ pppw=£{price_pppw:.2f}')

                display_addr = str(prop.get('displayAddress') or prop.get('address') or '')
                address      = re.sub(r',?\s*Exeter.*$', '', display_addr, flags=re.I).strip()
                # Rightmove sometimes uses displayAddress as marketing copy
                # e.g. "STUDENT ONLY | 51 WEEKS | EXETER | EX1" → strip gives garbage
                if is_garbage_address(address):
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

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
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

                bm   = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
                beds = int(bm.group(1)) if bm else 1

                pm_pw  = re.search(r'£([\d,]+)\s*pw\b', text, re.I)
                pm_pcm = re.search(r'£([\d,]+)\s*pcm\b', text, re.I)
                if pm_pw:
                    price_pppw = float(pm_pw.group(1).replace(',', '')) / beds
                elif pm_pcm:
                    price_pppw = float(pm_pcm.group(1).replace(',', '')) * 12 / 52 / beds
                else:
                    print(f'  [SKIP][Rightmove] no price: {ext_url}')
                    continue

                btm   = re.search(r'(\d+)\s+bath(?:room)?', text, re.I)
                baths = min(int(btm.group(1)), beds) if btm else 1

                h       = card.find(['h2', 'h3', 'h4', 'address'])
                address = h.get_text(strip=True) if h else ''
                address = re.sub(r',?\s*Exeter.*$', '', address, flags=re.I).strip()

                rm_img = pick_image(card, BASE)
                if not rm_img:
                    print(f'  [NO-PHOTO][Rightmove] pid={pid}')

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
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
            if price_diff <= 10:
                # Treat as same physical property
                print(f'  [DEDUP-ADDR] Same property detected: '
                      f'"{l["address"]}" {l["bedrooms"]}bed '
                      f'£{l["price_pppw"]} ({l["landlord_id"]}) vs '
                      f'£{existing["price_pppw"]} ({existing["landlord_id"]}) '
                      f'– keeping higher-completeness record')
                if completeness(l) > completeness(existing):
                    by_addr[key] = l
            else:
                # Different price → keep both (may be different-sized units at same address)
                # Use a price-qualified key to allow both through
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
    all_raw = []
    scrapers = [
        ('UniHomes',               scrape_unihomes),
        ('StuRents',               scrape_sturents),
        ('AccommodationForStudents', scrape_accommodationforstudents),
        ('Cardens',                scrape_cardens),
        ('Rightmove',              scrape_rightmove),
    ]

    for name, fn in scrapers:
        print(f'\n=== {name} ===')
        try:
            raw = fn()
            print(f'  → {len(raw)} raw listings')
            all_raw.extend(raw)
        except Exception as e:
            print(f'  [CRASH] {name}: {e}')

    # ── Validate ─────────────────────────────────────────────────────────────
    valid = []
    for l in all_raw:
        ok, reason = validate(l)
        if ok:
            valid.append(l)
        else:
            if 'price' in reason:
                print(f'  [PRICE-OUT][{l.get("landlord_id","?")}] '
                      f'{l.get("address","?")} – {reason} '
                      f'url={l.get("external_url","?")}')
            elif '[GEO-SKIP]' in reason:
                print(f'  {reason} [{l.get("landlord_id","?")}]')
            else:
                print(f'  [INVALID][{l.get("landlord_id","?")}] '
                      f'{l.get("address","?")} – {reason}')

    print(f'\nValidation: {len(all_raw)} raw → {len(valid)} valid')

    # ── Deduplicate ───────────────────────────────────────────────────────────
    unique = deduplicate(valid)
    print(f'Dedup:      {len(valid)} valid → {len(unique)} unique')

    # ── Upsert ───────────────────────────────────────────────────────────────
    now      = datetime.now(timezone.utc).isoformat()
    upserted = 0
    for l in unique:
        row = {
            'address':       l['address'],
            'price_pppw':    l['price_pppw'],
            'bedrooms':      l['bedrooms'],
            'bathrooms':     l['bathrooms'],
            'area':          l['area'],
            'external_url':  l['external_url'],
            'image_url':     l['image_url'],
            'bills_included': l.get('bills_included', False),
            'landlord_id':   l['landlord_id'],
            'last_scraped':  now,
        }
        try:
            supabase.table('properties').upsert(row, on_conflict='external_url').execute()
            upserted += 1
        except Exception as e:
            print(f'  [DB ERROR] {l["address"]}: {e}')

    print(f'Upserted:   {upserted}/{len(unique)}')

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
