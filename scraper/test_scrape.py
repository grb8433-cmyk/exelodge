"""
test_scrape.py — Quick test: fetch page 1 of each site, print first 3 listings.
Shows: address, price pppw, photo URL.
Run: python -X utf8 scraper/test_scrape.py
"""
import os, sys, re, json, time, requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

HEADERS = {
    'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                   'AppleWebKit/537.36 (KHTML, like Gecko) '
                   'Chrome/122.0.0.0 Safari/537.36'),
    'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
}

_DATE_ADDR_RE = re.compile(
    r'^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)'
    r'(?:\s+\d{4})?$', re.I)

_PHOTO_SKIP = ('icon', 'logo', 'marker', 'star', 'avatar', 'no-image', '.svg',
               'placeholder', '/logos/', 'spinner', 'loading')


def get_page(url, extra=None):
    h = {**HEADERS, **(extra or {})}
    try:
        r = requests.get(url, headers=h, timeout=20)
        if r.status_code != 200:
            print(f'  [HTTP {r.status_code}] {url}')
            return None, ''
        return BeautifulSoup(r.text, 'html.parser'), r.text
    except Exception as e:
        print(f'  [ERROR] {e}')
        return None, ''


def _first_srcset_url(srcset):
    if not srcset:
        return ''
    entries = re.split(r',\s+', srcset)
    return entries[0].strip().split()[0] if entries else ''


def pick_image(el, base):
    def _try(src):
        if not src or src.startswith('data:'):
            return None
        if any(k in src.lower() for k in _PHOTO_SKIP):
            return None
        full = urljoin(base, src)
        return full if full.startswith('http') else None

    for img in el.find_all('img'):
        for attr in ('data-src', 'src', 'data-lazy-src', 'data-original',
                     'data-lazy', 'data-bg', 'data-image'):
            r = _try(img.get(attr, ''))
            if r:
                return r
        r = _try(_first_srcset_url(img.get('srcset', '')))
        if r:
            return r
    # Check <source srcset> — UniHomes and others put real photos here
    for source in el.find_all('source'):
        r = _try(_first_srcset_url(source.get('srcset', '')))
        if r:
            return r
    return None


def row(address, price, photo):
    print(f'  Address: {str(address)[:80]}')
    print(f'  Price:   {price}')
    print(f'  Photo:   {photo}')
    print()


# ── UniHomes ──────────────────────────────────────────────────────────────────
print('=== UniHomes ===')
BASE = 'https://www.unihomes.co.uk'
soup, _ = get_page(f'{BASE}/student-accommodation/exeter')
if soup:
    cards = soup.find_all('a', href=re.compile(r'(?:^|unihomes\.co\.uk)/property/\d+'))
    shown = 0
    for card in cards:
        if shown >= 3:
            break
        href = card['href']
        ext_url = f'{BASE}{href}'.split('?')[0]
        text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()

        # Address
        address = ''
        pin_img = card.find('img', class_=re.compile(r'map.?pin|pin.?grey|location', re.I))
        if pin_img:
            addr_el = pin_img.find_parent('p')
            if addr_el:
                address = re.sub(r'\s+', ' ', addr_el.get_text(' ')).strip()
        if not address:
            for p in card.find_all('p'):
                txt = re.sub(r'\s+', ' ', p.get_text(' ')).strip()
                if (txt and '£' not in txt
                        and not re.search(r'per\s+(?:week|person)', txt, re.I)
                        and not re.search(r'^\d+\s+(?:bedroom|room)\b', txt, re.I)
                        and re.search(r'[A-Za-z]{3,}', txt)):
                    address = txt
                    break
        if not address:
            parts = href.rstrip('/').split('/')
            address = parts[-1].replace('-', ' ').title()
        address = re.sub(r'^\d+\s+Bedroom\s+\S+\s*', '', address, flags=re.I).strip()

        # Price
        m = re.search(r'£(\d+(?:\.\d+)?)\s+per\s+person\s+per\s+week', text, re.I)
        m2 = re.search(r'£(\d+(?:\.\d+)?)\s+per\s+week', text, re.I)
        if m:
            price = f'£{m.group(1)} pppw (direct)'
        elif m2:
            price = f'£{m2.group(1)} total pw'
        else:
            price = 'N/A'

        img = pick_image(card, BASE)
        row(address, price, img)
        shown += 1
else:
    print('  [FAILED to fetch]')

time.sleep(2)

# ── StuRents ──────────────────────────────────────────────────────────────────
print('=== StuRents ===')
BASE = 'https://sturents.com'
soup, _ = get_page(f'{BASE}/student-accommodation/exeter/listings')
shown = 0
_SR_PHOTO_SKIP = ('/logos/', '/logo/', 'placeholder', 'no-image', 'default', 'generic')
if soup:
    for script in soup.find_all('script', type='application/ld+json'):
        if shown >= 3:
            break
        try:
            data = json.loads(script.string or '[]')
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if shown >= 3:
                break
            if item.get('@type') not in {
                    'Residence', 'Accommodation', 'House', 'Apartment', 'LodgingBusiness'}:
                continue

            ext_url = item.get('url', '') or ''
            if not ext_url.startswith('http'):
                ext_url = urljoin(BASE, ext_url)

            ao = item.get('address', {})
            if isinstance(ao, dict):
                address = f"{ao.get('streetAddress', '')} {ao.get('addressLocality', '')}".strip()
                if re.match(r'^exeter\b', address, re.I):
                    address = ''
            else:
                address = str(ao).strip()
                if _DATE_ADDR_RE.match(address):
                    address = ''
            if not address:
                name = item.get('name', '')
                if not _DATE_ADDR_RE.match(name.strip()):
                    address = name

            blob = json.dumps(item, ensure_ascii=False)
            pm = re.search(r'£(\d+(?:\.\d+)?)\s*(?:pppw|per\s+person\s+per\s+week)', blob, re.I)
            price = f'£{pm.group(1)} pppw' if pm else 'N/A'

            img_raw = item.get('image', '')
            if isinstance(img_raw, list):
                img_raw = img_raw[0] if img_raw else ''
            img_raw = str(img_raw)
            if img_raw.startswith('http') and not any(k in img_raw.lower() for k in _SR_PHOTO_SKIP):
                img = img_raw
            else:
                img = None

            row(address, price, img)
            shown += 1
    if shown == 0:
        print('  [No JSON-LD items found]')
else:
    print('  [FAILED to fetch]')

time.sleep(2)

# ── AccommodationForStudents ──────────────────────────────────────────────────
print('=== AccommodationForStudents ===')
BASE = 'https://www.accommodationforstudents.com'
soup, _ = get_page(f'{BASE}/exeter')
shown = 0
if soup:
    nd_script = soup.find('script', id='__NEXT_DATA__')
    if nd_script:
        try:
            nd = json.loads(nd_script.string or '{}')
            pp = nd.get('props', {}).get('pageProps', {})
            vm = pp.get('viewModel', pp)
            properties = (vm.get('properties') or vm.get('listings') or
                          vm.get('results') or [])
            for prop in properties:
                if shown >= 3:
                    break
                ext_url = prop.get('url') or prop.get('link') or ''
                price_raw = (prop.get('price') or prop.get('weeklyPrice') or
                             prop.get('pricePerWeek') or 0)
                try:
                    price_f = float(str(price_raw).replace('£', '').replace(',', '').split()[0])
                except Exception:
                    continue
                addr_parts = [prop.get('address') or prop.get('street') or '',
                              prop.get('area') or prop.get('district') or '']
                address = ', '.join(p for p in addr_parts if p).strip(', ')
                if not address:
                    address = prop.get('title') or prop.get('name') or ''
                img_raw = (prop.get('image') or prop.get('imageUrl') or
                           prop.get('thumbnail') or '')
                img = img_raw if (img_raw and str(img_raw).startswith('http')) else None
                row(address, f'£{price_f} pppw', img)
                shown += 1
        except Exception as e:
            print(f'  [AFS error] {e}')
    # Strategy B: HTML link scraping (the /exeter page has 0 properties in __NEXT_DATA__)
    if shown == 0:
        for link in soup.find_all('a', href=re.compile(r'/property/\d+')):
            if shown >= 3:
                break
            card = link.find_parent(['article', 'div', 'li']) or link
            text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
            if '£' not in text:
                continue
            pm = re.search(r'£\s*(\d+(?:\.\d+)?)\s*(?:/\s*week|per\s+week)', text, re.I)
            if not pm:
                continue
            price_f = float(pm.group(1))
            # Real address is in <p class="...address...">
            addr_el = card.find('p', class_=re.compile(r'address', re.I))
            if addr_el:
                address = re.sub(r',?\s*Exeter.*$', '', addr_el.get_text(strip=True), flags=re.I).strip()
            else:
                aria = link.get('aria-label', '')
                address = re.sub(r',?\s*Exeter.*$', '', aria.split(' - ', 1)[-1] if ' - ' in aria else aria, flags=re.I).strip()
            img = pick_image(card, BASE)
            row(address, f'£{price_f} pppw', img)
            shown += 1
    if shown == 0:
        print('  [No AFS properties found]')
else:
    print('  [FAILED to fetch]')

time.sleep(2)

# ── Rightmove ─────────────────────────────────────────────────────────────────
print('=== Rightmove ===')
BASE = 'https://www.rightmove.co.uk'
soup, raw = get_page(f'{BASE}/student-accommodation/Exeter.html')
shown = 0
if soup:
    # Strategy A: __NEXT_DATA__ (Rightmove Next.js — primary since 2025)
    model = {}
    nd_script = soup.find('script', id='__NEXT_DATA__')
    if nd_script:
        try:
            nd    = json.loads(nd_script.string or '{}')
            model = (nd.get('props', {})
                       .get('pageProps', {})
                       .get('searchResults', {}))
        except Exception as e:
            print(f'  [__NEXT_DATA__ error] {e}')

    # Strategy B: legacy window.jsonModel (pre-2025 fallback)
    if not model.get('properties'):
        for script in soup.find_all('script'):
            src = script.string or ''
            m = re.search(r'window\.jsonModel\s*=\s*(\{.+\})\s*;?\s*(?:window\.|</script>)',
                          src, re.S)
            if m:
                try:
                    model = json.loads(m.group(1))
                except Exception:
                    pass
                break

    for prop in model.get('properties', []):
        if shown >= 3:
            break
        pid = prop.get('id')
        if not pid:
            continue
        display_addr = str(prop.get('displayAddress') or prop.get('address') or '')
        address = re.sub(r',?\s*Exeter.*$', '', display_addr, flags=re.I).strip()
        # Skip marketing-copy addresses
        if not address or '|' in address:
            continue

        price_info = prop.get('price', {})
        amount = float(price_info.get('amount') or 0)
        freq = str(price_info.get('frequency', '')).lower()
        beds = max(1, int(prop.get('bedrooms') or prop.get('beds') or 1))
        if 'month' in freq or 'pcm' in freq:
            pppw = (amount * 12 / 52) / beds
        else:
            pppw = amount / beds

        prop_imgs = prop.get('propertyImages', {}) or {}
        image_url = None
        main_src = prop_imgs.get('mainImageSrc') or ''
        if main_src and str(main_src).startswith('http'):
            image_url = str(main_src)
        if not image_url:
            imgs = prop_imgs.get('images') or prop.get('images') or []
            if imgs:
                src2 = imgs[0].get('srcUrl') or imgs[0].get('url') or ''
                if src2 and str(src2).startswith('http'):
                    image_url = str(src2)

        row(address, f'£{pppw:.2f} pppw (raw={amount} {freq!r})', image_url)
        shown += 1

    if shown == 0:
        print('  [No Rightmove properties found]')
else:
    print('  [FAILED to fetch]')

# ── Cardens ───────────────────────────────────────────────────────────────────
print('=== Cardens ===')
BASE = 'https://www.cardensestateagents.co.uk'
soup, _ = get_page(f'{BASE}/students',
                   extra={'Referer': 'https://www.google.co.uk/', 'DNT': '1'})
shown = 0
if soup:
    cards = (soup.select('div.property-item, div.property-card, article.property') or
             soup.find_all('a', href=re.compile(r'/property(?:ies)?/')))
    for card in cards:
        if shown >= 3:
            break
        link = card if card.name == 'a' else card.find('a', href=True)
        if not link:
            continue
        ext_url = urljoin(BASE, link['href']).split('?')[0]
        container = card
        text = re.sub(r'\s+', ' ', container.get_text(' ')).strip()
        if '£' not in text:
            continue
        bm = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
        beds = int(bm.group(1)) if bm else 1
        pm_pw = re.search(r'£([\d,]+)\s*(?:pw|per\s+week)', text, re.I)
        pm_pcm = re.search(r'£([\d,]+)\s*(?:pcm|per\s+(?:calendar\s+)?month)', text, re.I)
        if pm_pw:
            pppw = float(pm_pw.group(1).replace(',', '')) / beds
        elif pm_pcm:
            pppw = float(pm_pcm.group(1).replace(',', '')) * 12 / 52 / beds
        else:
            continue
        h = container.find(['h2', 'h3', 'h4'])
        address = h.get_text(strip=True) if h else ''
        img = pick_image(container, BASE)
        row(address, f'£{pppw:.2f} pppw', img)
        shown += 1
    if shown == 0:
        print('  [No listings found — likely 403 blocked]')
else:
    print('  [FAILED to fetch — likely 403 blocked]')
