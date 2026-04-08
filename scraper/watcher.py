import os
import re
import json
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

# ─── CONFIG ──────────────────────────────────────────────────────────────────

DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1518780664697-55e3ad937233'
MIN_PPPW      = 50.0
MAX_PPPW      = 400.0

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


def validate(listing):
    """Return (True, '') or (False, reason)."""
    price = listing.get('price_pppw', 0)
    beds  = listing.get('bedrooms', 0)
    baths = listing.get('bathrooms', 0)
    addr  = listing.get('address', '').strip()
    url   = listing.get('external_url', '')

    if not addr or len(addr.split()) < 2:
        return False, f"address too short: '{addr}'"
    if not url.startswith('http'):
        return False, f"invalid url: '{url}'"
    if not (MIN_PPPW <= price <= MAX_PPPW):
        return False, f"price £{price:.0f} pppw outside £{MIN_PPPW:.0f}–£{MAX_PPPW:.0f}"
    if not (1 <= beds <= 12):
        return False, f"beds={beds} out of range 1–12"
    if not (1 <= baths <= beds):
        return False, f"baths={baths} invalid for {beds} beds"
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
    """Return first plausible property image from a BeautifulSoup element."""
    SKIP = {'icon', 'logo', 'marker', 'star', 'avatar', 'no-image', '.svg', 'placeholder'}
    for img in el.find_all('img'):
        src = (img.get('data-src') or img.get('src') or
               img.get('data-lazy-src') or img.get('data-original') or '')
        if src and not any(k in src.lower() for k in SKIP):
            return urljoin(base, src)
    return DEFAULT_IMAGE


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

    for page in range(1, 15):
        url = f'{BASE}/student-accommodation/exeter' + (f'?page={page}' if page > 1 else '')
        soup, _ = get_page(url)
        if not soup:
            break

        cards = soup.find_all('a', href=re.compile(r'^/property/\d+'))
        if not cards:
            print(f'  [UniHomes] page {page}: no cards – stopping')
            break

        added = 0
        for card in cards:
            href    = card['href']
            ext_url = f'{BASE}{href}'.split('?')[0]
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
            m_beds     = re.search(r'(\d+)\s+bed(?:room)?', text, re.I)
            m_url_beds = re.search(r'/(\d+)-bed(?:room)?-', href, re.I)
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

            # ── Baths ─────────────────────────────────────────────────────────
            m_baths = re.search(r'(\d+)\s+bathroom', text, re.I)
            baths   = min(int(m_baths.group(1)), beds) if m_baths else 1

            # ── Address ───────────────────────────────────────────────────────
            # Cards render: <p><img class="map-pin-grey"> Road Name, Area</p>
            addr_el = card.find('p', string=re.compile(r'[A-Za-z]{3,}'))
            if addr_el:
                address = re.sub(r'\s+', ' ', addr_el.get_text(' ')).strip()
            else:
                # Fall back to last URL slug segment
                parts   = href.rstrip('/').split('/')
                address = parts[-1].replace('-', ' ').title() if parts else ''

            address = re.sub(r'^\d+\s+Bedroom\s+\S+\s*', '', address, flags=re.I).strip()

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'area':          detect_area(f'{address} {href}'),
                'external_url':  ext_url,
                'image_url':     pick_image(card, BASE),
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

    for offset in range(0, 360, 12):
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
                if ext_url in seen:
                    continue
                seen.add(ext_url)

                ao = item.get('address', {})
                if isinstance(ao, dict):
                    address = f"{ao.get('streetAddress','')} {ao.get('addressLocality','')}".strip()
                else:
                    address = str(ao)
                if not address:
                    address = item.get('name', '')

                blob = json.dumps(item)
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

                img = item.get('image', DEFAULT_IMAGE)
                if isinstance(img, list):
                    img = img[0] if img else DEFAULT_IMAGE
                if not str(img).startswith('http'):
                    img = DEFAULT_IMAGE

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

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     pick_image(card, BASE),
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

    for page in range(1, 15):
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
                    if not ext_url or ext_url in seen:
                        continue
                    if not ext_url.startswith('http'):
                        ext_url = urljoin(BASE, ext_url)
                    seen.add(ext_url)

                    price_raw = (prop.get('price') or prop.get('weeklyPrice') or
                                 prop.get('pricePerWeek') or 0)
                    try:
                        price_pppw = float(
                            str(price_raw).replace('£', '').replace(',', '').split()[0])
                    except Exception:
                        continue
                    if price_pppw == 0:
                        continue

                    beds  = max(1, int(prop.get('bedrooms') or prop.get('beds') or 1))
                    baths = max(1, int(prop.get('bathrooms') or prop.get('baths') or 1))
                    baths = min(baths, beds)

                    addr_parts = [prop.get('address') or prop.get('street') or '',
                                  prop.get('area') or prop.get('district') or '']
                    address = ', '.join(p for p in addr_parts if p).strip(', ')
                    if not address:
                        address = prop.get('title') or prop.get('name') or ''

                    img = (prop.get('image') or prop.get('imageUrl') or
                           prop.get('thumbnail') or DEFAULT_IMAGE)

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
                if ext_url in seen:
                    continue

                # Walk up to the card container
                card = link.find_parent(['article', 'div', 'li']) or link
                seen.add(ext_url)

                text = re.sub(r'\s+', ' ', card.get_text(' ')).strip()
                if '£' not in text:
                    continue

                # AFS price is per person per week
                pm = re.search(r'£(\d+(?:\.\d+)?)\s*(?:/\s*week|per\s+week)', text, re.I)
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

                h       = card.find(['h2', 'h3', 'h4'])
                address = h.get_text(strip=True) if h else link.get_text(strip=True)

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     pick_image(card, BASE),
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
    extra = {'Referer': 'https://www.google.co.uk/', 'DNT': '1'}
    results, seen = [], set()

    for page in range(1, 10):
        url  = f'{BASE}/students' + (f'?page={page}' if page > 1 else '')
        soup, _ = get_page(url, extra)
        if not soup:
            print(f'  [Cardens] blocked or unreachable – skipping')
            break

        cards = (soup.select('div.property-item, div.property-card, article.property') or
                 soup.find_all('a', href=re.compile(r'/property(?:ies)?/')))
        if not cards:
            break

        added = 0
        for card in cards:
            link      = card if card.name == 'a' else card.find('a', href=True)
            container = card
            if not link:
                continue
            ext_url = urljoin(BASE, link['href']).split('?')[0]
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

            results.append({
                'address':       address,
                'price_pppw':    round(price_pppw, 2),
                'bedrooms':      beds,
                'bathrooms':     baths,
                'area':          detect_area(address),
                'external_url':  ext_url,
                'image_url':     pick_image(container, BASE),
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
    Strategy A: parse window.jsonModel embedded JSON.
    Strategy B: scrape HTML cards with links /properties/{id}.
    Price     : pcm → (pcm × 12 / 52) / beds = pppw
                pw  → pw / beds = pppw
    Pagination: ?index=N (24 per page)
    """
    BASE = 'https://www.rightmove.co.uk'
    results, seen = [], set()

    for page_idx in range(0, 10):
        index = page_idx * 24
        url   = (f'{BASE}/student-accommodation/Exeter.html'
                 + (f'?index={index}' if index else ''))
        soup, raw = get_page(url)
        if not soup:
            break

        added = 0

        # Strategy A: window.jsonModel
        for script in soup.find_all('script'):
            src = script.string or ''
            m   = re.search(r'window\.jsonModel\s*=\s*(\{.+?\})\s*;?\s*(?:window\.|</script>)',
                            src, re.S)
            if not m:
                continue
            try:
                model = json.loads(m.group(1))
            except Exception:
                continue

            for prop in model.get('properties', []):
                pid = prop.get('id')
                if not pid:
                    continue
                ext_url = f'{BASE}/properties/{pid}#/?channel=STU_LET'
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
                    # Heuristic: >500 is almost certainly monthly
                    price_pppw = (amount * 12 / 52 / beds) if amount > 500 else (amount / beds)

                display_addr = str(prop.get('displayAddress') or prop.get('address') or '')
                address      = re.sub(r',?\s*Exeter.*$', '', display_addr, flags=re.I).strip()

                imgs      = prop.get('propertyImages', {}).get('images', [])
                image_url = imgs[0].get('srcUrl', DEFAULT_IMAGE) if imgs else DEFAULT_IMAGE

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
            if added > 0:
                break  # found data from this script tag

        # Strategy B: HTML cards
        if added == 0:
            for link in soup.find_all('a', href=re.compile(r'/properties/\d+')):
                pid     = re.search(r'/properties/(\d+)', link['href']).group(1)
                ext_url = f'{BASE}/properties/{pid}#/?channel=STU_LET'
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

                results.append({
                    'address':       address,
                    'price_pppw':    round(price_pppw, 2),
                    'bedrooms':      beds,
                    'bathrooms':     baths,
                    'area':          detect_area(address),
                    'external_url':  ext_url,
                    'image_url':     pick_image(card, BASE),
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
    Pass 1: deduplicate by exact external_url.
    Pass 2: deduplicate by normalised(address) + bedrooms,
            keeping the entry with the highest completeness score.
    """
    # Pass 1
    by_url = {}
    for l in listings:
        if l['external_url'] not in by_url:
            by_url[l['external_url']] = l

    def completeness(l):
        score = 0
        if l['image_url'] != DEFAULT_IMAGE:   score += 2
        if l.get('bills_included'):            score += 1
        if l['bathrooms'] > 1:                score += 1
        if len(l['address'].split()) > 3:     score += 1
        return score

    def addr_key(l):
        a = re.sub(r'[^a-z0-9]', '', l['address'].lower())
        return f"{a}_{l['bedrooms']}"

    # Pass 2
    by_addr = {}
    for l in by_url.values():
        key = addr_key(l)
        if key not in by_addr or completeness(l) > completeness(by_addr[key]):
            by_addr[key] = l

    return list(by_addr.values())


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
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
