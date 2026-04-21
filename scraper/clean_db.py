"""
clean_db.py — Retroactive database clean for ExeLodge Supabase listings.
"""

import os
import re
import argparse
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from supabase import create_client

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ─── CONFIG ──────────────────────────────────────────────────────────────────

MIN_PPPW = 75.0
MAX_PPPW = 300.0

TEST_WORDS = ['test', 'dummy', 'placeholder', 'n/a']

_DATE_ADDR_RE = re.compile(
    r'^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)'
    r'(?:\s+\d{4})?$',
    re.I)

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
    
    if re.match(
            r'^(?:halls?|houses?|flats?|rooms?|studios?|apartments?)\s+in\b',
            addr, re.I):
        return True
    if re.match(
            r'^\d+\s+bed(?:room)?\s+(?:house|flat|apartment|studio|bungalow)',
            addr, re.I):
        return True
    if _GARBAGE_WORD_RE.match(addr) and not _STREET_TYPE_RE.search(addr):
        return True
    if re.match(r'^\d{5,}\s+\w+', addr):
        return True
    
    MARKETING_TERMS = {'STUDENT ONLY', 'AVAILABLE NOW', 'WEEKS', 'SEPTEMBER', 'JULY'}
    addr_upper = addr.upper()
    
    if '|' in addr:
        if not _STREET_TYPE_RE.search(addr):
            return True
    
    if any(term in addr_upper for term in MARKETING_TERMS) and not _STREET_TYPE_RE.search(addr):
        return True

    return False

PLACEHOLDER_IMG_PATTERNS = [
    'images.unsplash.com',
    '/logos/',
    '/logo/',
]

_TRACKING_PARAMS = frozenset({
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'ref', 'referrer', 'source', 'fbclid', 'gclid', 'mc_cid', 'mc_eid',
})


# ─── HELPERS ─────────────────────────────────────────────────────────────────

def normalize_url(url):
    if not url:
        return ''
    try:
        p = urlparse((url or '').strip().lower())
        netloc = p.netloc
        if netloc.startswith('www.'):
            netloc = netloc[4:]
        clean_query = {k: v for k, v in parse_qs(p.query).items()
                       if k not in _TRACKING_PARAMS}
        return urlunparse((
            p.scheme, netloc, p.path.rstrip('/'),
            p.params, urlencode(clean_query, doseq=True), '',
        ))
    except Exception:
        return (url or '').strip().lower().rstrip('/')


def addr_key(listing):
    address = (listing.get('address') or '').lower()
    clean = re.sub(r'[^a-z0-9]', '', address)
    beds = int(listing.get('bedrooms') or 0)
    return f'{clean}_{beds}'


def sort_key(listing):
    """Sort listings most-recently-scraped first."""
    return listing.get('last_scraped') or listing.get('updated_at') or ''


def delete_by_id(supabase, listing_id, reason, dry_run=False):
    if dry_run:
        print(f'    [DRY-RUN] Would delete id={listing_id}: {reason}')
    else:
        try:
            supabase.table('properties').delete().eq('id', listing_id).execute()
        except Exception as e:
            print(f'    [ERROR] Could not delete id={listing_id}: {e}')


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--university', default=None, help='Filter by University ID')
    parser.add_argument('--dry-run', action='store_true', help='Do not actually delete')
    args = parser.parse_args()

    SUPABASE_URL = (os.environ.get('SUPABASE_URL') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_URL'))
    SUPABASE_KEY = (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_ANON_KEY'))
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Fetch listings ────────────────────────────────────────────────────────
    query = supabase.table('properties').select('*')
    if args.university:
        query = query.eq('university', args.university)
        print(f'Fetching listings for university: {args.university}')
    else:
        print('Fetching all listings from Supabase…')
        
    resp = query.execute()
    listings = resp.data or []
    print(f'Total listings to check: {len(listings)}\n')

    deleted_test = 0
    deleted_price = 0
    deleted_url_dup = 0
    deleted_addr_dup = 0
    deleted_date_addr = 0
    deleted_placeholder_img = 0
    deleted_garbage_addr = 0
    ids_deleted = set()

    # ── Phase 0: Test/dummy listings ─────────────────────────────────────────
    print('─── Phase 0: Test/dummy listings ─────────────────────────────────')
    for l in listings:
        if l['id'] in ids_deleted:
            continue
        addr = (l.get('address') or '').lower()
        price = l.get('price_pppw')
        if (any(w in addr for w in TEST_WORDS) or price == 0 or price is None):
            print(f'  [TEST] id={l["id"]} addr="{l.get("address","?")}" '
                  f'price={price} src={l.get("landlord_id","?")}')
            delete_by_id(supabase, l['id'], 'test/dummy listing', args.dry_run)
            ids_deleted.add(l['id'])
            deleted_test += 1

    print(f'Phase 0 complete: {deleted_test} deleted.\n')

    # ── Phase 1: Price outliers ───────────────────────────────────────────────
    print('─── Phase 1: Price outliers ───────────────────────────────────────')
    for l in listings:
        if l['id'] in ids_deleted:
            continue
        price = float(l.get('price_pppw') or 0)
        if not (MIN_PPPW <= price <= MAX_PPPW):
            print(f'  [BAD-PRICE] id={l["id"]} addr="{l.get("address","?")}" '
                  f'price=£{price:.0f} source={l.get("landlord_id","?")}')
            delete_by_id(supabase, l['id'], f'price £{price:.0f} outside £{MIN_PPPW:.0f}–£{MAX_PPPW:.0f}', args.dry_run)
            ids_deleted.add(l['id'])
            deleted_price += 1

    print(f'Phase 1 complete: {deleted_price} deleted for bad price.\n')

    # ── Phase 2: URL duplicates ───────────────────────────────────────────────
    print('─── Phase 2: URL duplicates ───────────────────────────────────────')
    url_groups = {}
    for l in listings:
        if l['id'] in ids_deleted: continue
        key = normalize_url(l.get('external_url', ''))
        url_groups.setdefault(key, []).append(l)

    for key, group in url_groups.items():
        if len(group) < 2:
            continue
        group.sort(key=sort_key, reverse=True)
        keeper = group[0]
        for dup in group[1:]:
            print(f'  [URL-DUP] Keeping id={keeper["id"]} | Deleting id={dup["id"]}')
            delete_by_id(supabase, dup['id'], 'URL duplicate', args.dry_run)
            ids_deleted.add(dup['id'])
            deleted_url_dup += 1

    # ── Phase 3: Address+beds+price duplicates ────────────────────────────────
    print('\n─── Phase 3: Address+beds+price duplicates ────────────────────────')
    addr_groups = {}
    for l in listings:
        if l['id'] in ids_deleted: continue
        key = addr_key(l)
        if not key or key == '_0': continue
        addr_groups.setdefault(key, []).append(l)

    for key, group in addr_groups.items():
        if len(group) < 2: continue
        group.sort(key=sort_key, reverse=True)
        kept = []
        for candidate in group:
            is_dup = False
            for keeper in kept:
                price_diff = abs(float(candidate.get('price_pppw') or 0) - float(keeper.get('price_pppw') or 0))
                if price_diff <= 2:
                    is_dup = True
                    print(f'  [ADDR-DUP] "{candidate.get("address","?")}" → dup of id={keeper["id"]}')
                    delete_by_id(supabase, candidate['id'], 'addr+beds+price duplicate', args.dry_run)
                    ids_deleted.add(candidate['id'])
                    deleted_addr_dup += 1
                    break
            if not is_dup: kept.append(candidate)

    # ── Phase 4: Date-as-address listings ────────────────────────────────────
    print('\n─── Phase 4: Date-as-address listings ────────────────────────────')
    for l in listings:
        if l['id'] in ids_deleted: continue
        addr = (l.get('address') or '').strip()
        if _DATE_ADDR_RE.match(addr):
            print(f'  [DATE-ADDR] id={l["id"]} addr="{addr}"')
            delete_by_id(supabase, l['id'], 'address looks like a date', args.dry_run)
            ids_deleted.add(l['id'])
            deleted_date_addr += 1

    # ── Phase 5: Generic/placeholder image URLs ───────────────────────────────
    print('\n─── Phase 5: Generic/placeholder images ──────────────────────────')
    for l in listings:
        if l['id'] in ids_deleted: continue
        img = l.get('image_url') or ''
        if any(p in img for p in PLACEHOLDER_IMG_PATTERNS):
            print(f'  [PLACEHOLDER-IMG] id={l["id"]} img={img[:60]}')
            delete_by_id(supabase, l['id'], 'placeholder/generic image URL', args.dry_run)
            ids_deleted.add(l['id'])
            deleted_placeholder_img += 1

    # ── Phase 6: Garbage/description addresses ────────────────────────────────
    print('\n─── Phase 6: Garbage/description addresses ───────────────────────')
    for l in listings:
        if l['id'] in ids_deleted: continue
        addr = (l.get('address') or '').strip()
        if is_garbage_address(addr):
            print(f'  [GARBAGE-ADDR] id={l["id"]} addr="{addr}"')
            delete_by_id(supabase, l['id'], 'garbage/description address', args.dry_run)
            ids_deleted.add(l['id'])
            deleted_garbage_addr += 1

    print('\n═══════════════════════════════════════════════════════════════════')
    print(f'  Total deleted/to-delete:      {len(ids_deleted)}')
    print('═══════════════════════════════════════════════════════════════════')

if __name__ == '__main__':
    main()
