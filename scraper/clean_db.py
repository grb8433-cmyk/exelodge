"""
clean_db.py — Retroactive database clean for ExeLodge Supabase listings.

Deletes:
  1. Listings with price_pppw outside £120–£400
  2. Duplicate listings by normalised URL (keep most-recently scraped)
  3. Duplicate listings by address + bedrooms + price within £10 (keep most-recently scraped)

Run: python scraper/clean_db.py
Env vars required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import os
import re
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from supabase import create_client

# ─── CONFIG ──────────────────────────────────────────────────────────────────

MIN_PPPW = 100.0
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
    
    if any(term in addr_upper for term in MARKETING_TERMS) and not _STREET_TYPE_RE.search(addr):
        return True

    return False

# Known generic/placeholder image substrings — any image_url containing these
# is a scraper fallback image, not a real property photo.
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
    SUPABASE_URL = (os.environ.get('SUPABASE_URL') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_URL'))
    SUPABASE_KEY = (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
                    os.environ.get('EXPO_PUBLIC_SUPABASE_ANON_KEY'))
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY '
              '(or EXPO_PUBLIC_ equivalents)')
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # ── Fetch all listings ────────────────────────────────────────────────────
    print('Fetching all listings from Supabase…')
    resp = supabase.table('properties').select('*').execute()
    listings = resp.data or []
    print(f'Total listings before clean: {len(listings)}\n')

    deleted_test = 0
    deleted_price = 0
    deleted_url_dup = 0
    deleted_addr_dup = 0
    deleted_date_addr = 0
    deleted_placeholder_img = 0
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
            delete_by_id(supabase, l['id'], 'test/dummy listing')
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
            delete_by_id(supabase, l['id'], f'price £{price:.0f} outside £{MIN_PPPW:.0f}–£{MAX_PPPW:.0f}')
            ids_deleted.add(l['id'])
            deleted_price += 1

    print(f'Phase 1 complete: {deleted_price} deleted for bad price.\n')

    # ── Re-fetch after Phase 1 ────────────────────────────────────────────────
    resp = supabase.table('properties').select('*').execute()
    listings = resp.data or []

    # ── Phase 2: URL duplicates ───────────────────────────────────────────────
    print('─── Phase 2: URL duplicates ───────────────────────────────────────')
    url_groups: dict[str, list] = {}
    for l in listings:
        key = normalize_url(l.get('external_url', ''))
        url_groups.setdefault(key, []).append(l)

    for key, group in url_groups.items():
        if len(group) < 2:
            continue
        group.sort(key=sort_key, reverse=True)  # most recent first
        keeper = group[0]
        for dup in group[1:]:
            if dup['id'] in ids_deleted:
                continue
            print(f'  [URL-DUP] Keeping id={keeper["id"]} last_scraped={keeper.get("last_scraped","?")} '
                  f'| Deleting id={dup["id"]} url="{dup.get("external_url","")[:80]}"')
            delete_by_id(supabase, dup['id'], 'URL duplicate')
            ids_deleted.add(dup['id'])
            deleted_url_dup += 1

    print(f'Phase 2 complete: {deleted_url_dup} deleted for URL duplicates.\n')

    # ── Re-fetch after Phase 2 ────────────────────────────────────────────────
    resp = supabase.table('properties').select('*').execute()
    listings = resp.data or []

    # ── Phase 3: Address+beds+price duplicates ────────────────────────────────
    print('─── Phase 3: Address+beds+price duplicates ────────────────────────')
    addr_groups: dict[str, list] = {}
    for l in listings:
        key = addr_key(l)
        if not key or key == '_0':
            continue
        addr_groups.setdefault(key, []).append(l)

    for key, group in addr_groups.items():
        if len(group) < 2:
            continue
        group.sort(key=sort_key, reverse=True)  # most recent first

        kept = []
        for candidate in group:
            if candidate['id'] in ids_deleted:
                continue
            # Check if this candidate is a price-match duplicate of any keeper
            is_dup = False
            for keeper in kept:
                price_diff = abs(
                    float(candidate.get('price_pppw') or 0) -
                    float(keeper.get('price_pppw') or 0)
                )
                if price_diff <= 2:
                    is_dup = True
                    print(f'  [ADDR-DUP] '
                          f'"{candidate.get("address","?")} ({candidate.get("bedrooms","?")}bed '
                          f'£{candidate.get("price_pppw","?")} {candidate.get("landlord_id","?")})" '
                          f'→ dup of id={keeper["id"]} '
                          f'(price diff £{price_diff:.2f}) | Deleting id={candidate["id"]}')
                    delete_by_id(supabase, candidate['id'], 'addr+beds+price duplicate')
                    ids_deleted.add(candidate['id'])
                    deleted_addr_dup += 1
                    break
            if not is_dup:
                kept.append(candidate)

    print(f'Phase 3 complete: {deleted_addr_dup} deleted for addr/beds/price duplicates.\n')

    # ── Re-fetch after Phase 3 ───────────────────────────────────────────────
    resp = supabase.table('properties').select('*').execute()
    listings = resp.data or []

    # ── Phase 4: Date-as-address listings ────────────────────────────────────
    print('─── Phase 4: Date-as-address listings ────────────────────────────')
    for l in listings:
        if l['id'] in ids_deleted:
            continue
        addr = (l.get('address') or '').strip()
        if _DATE_ADDR_RE.match(addr):
            print(f'  [DATE-ADDR] id={l["id"]} addr="{addr}" '
                  f'src={l.get("landlord_id","?")}')
            delete_by_id(supabase, l['id'], f'address looks like a date: {addr!r}')
            ids_deleted.add(l['id'])
            deleted_date_addr += 1

    print(f'Phase 4 complete: {deleted_date_addr} deleted for date-as-address.\n')

    # ── Re-fetch after Phase 4 ───────────────────────────────────────────────
    resp = supabase.table('properties').select('*').execute()
    listings = resp.data or []

    # ── Phase 5: Generic/placeholder image URLs ───────────────────────────────
    print('─── Phase 5: Generic/placeholder images ──────────────────────────')
    print(f'  (Patterns: {PLACEHOLDER_IMG_PATTERNS})')
    for l in listings:
        if l['id'] in ids_deleted:
            continue
        img = l.get('image_url') or ''
        if any(p in img for p in PLACEHOLDER_IMG_PATTERNS):
            print(f'  [PLACEHOLDER-IMG] id={l["id"]} '
                  f'addr="{l.get("address","?")[:50]}" '
                  f'src={l.get("landlord_id","?")} img={img[:80]}')
            delete_by_id(supabase, l['id'], 'placeholder/generic image URL')
            ids_deleted.add(l['id'])
            deleted_placeholder_img += 1

    print(f'Phase 5 complete: {deleted_placeholder_img} deleted for placeholder images.\n')

    # ── Re-fetch after Phase 5 ───────────────────────────────────────────────
    resp = supabase.table('properties').select('*').execute()
    listings = resp.data or []

    # ── Phase 6: Garbage/description addresses ────────────────────────────────
    deleted_garbage_addr = 0
    print('─── Phase 6: Garbage/description addresses ───────────────────────')
    for l in listings:
        if l['id'] in ids_deleted:
            continue
        addr = (l.get('address') or '').strip()
        if is_garbage_address(addr):
            print(f'  [GARBAGE-ADDR] id={l["id"]} addr="{addr}" '
                  f'src={l.get("landlord_id","?")}')
            delete_by_id(supabase, l['id'], f'garbage/description address: {addr!r}')
            ids_deleted.add(l['id'])
            deleted_garbage_addr += 1

    print(f'Phase 6 complete: {deleted_garbage_addr} deleted for garbage addresses.\n')

    # ── Final count ───────────────────────────────────────────────────────────
    resp = supabase.table('properties').select('id').execute()
    remaining = len(resp.data or [])

    total_deleted = (deleted_test + deleted_price + deleted_url_dup +
                     deleted_addr_dup + deleted_date_addr + deleted_placeholder_img +
                     deleted_garbage_addr)
    print('═══════════════════════════════════════════════════════════════════')
    print(f'  Deleted test/dummy:           {deleted_test}')
    print(f'  Deleted for bad price:        {deleted_price}')
    print(f'  Deleted for URL duplicate:    {deleted_url_dup}')
    print(f'  Deleted for addr duplicate:   {deleted_addr_dup}')
    print(f'  Deleted date-as-address:      {deleted_date_addr}')
    print(f'  Deleted placeholder images:   {deleted_placeholder_img}')
    print(f'  Deleted garbage addresses:    {deleted_garbage_addr}')
    print(f'  Total deleted:                {total_deleted}')
    print(f'  Remaining listings:           {remaining}')
    print('═══════════════════════════════════════════════════════════════════')

    # ── Schema advice ─────────────────────────────────────────────────────────
    print("""
IMPORTANT — Supabase schema check:
  The scraper uses upsert(on_conflict='external_url'), which requires a UNIQUE
  constraint on the external_url column. Without it, upsert acts as INSERT and
  every scraper run adds duplicate rows.

  If you don't already have this constraint, run the following SQL in the
  Supabase SQL editor:

    ALTER TABLE properties
      ADD CONSTRAINT properties_external_url_key UNIQUE (external_url);

  You can check whether the constraint exists with:

    SELECT conname FROM pg_constraint
    WHERE conrelid = 'properties'::regclass
      AND contype = 'u';

  Do NOT run this migration until after clean_db.py has removed existing
  duplicates (duplicate external_url values would prevent the ALTER TABLE).
""")


if __name__ == '__main__':
    main()
