import os
import requests
import argparse
from supabase import create_client, Client
from urllib.parse import urlparse

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/122.0.0.0 Safari/537.36'
    ),
    'Accept': '*/*',
}

def is_redirected_to_homepage(original_url, final_url):
    """
    Check if the URL was redirected to a homepage/listing page
    rather than a specific property page.
    """
    orig = urlparse(original_url)
    fin  = urlparse(final_url)
    
    # If paths are identical, not a homepage redirect
    if orig.path.rstrip('/') == fin.path.rstrip('/'):
        return False
        
    # If final path is very short (homepage) or just a listing page
    # and the original path was long (specific property)
    if len(fin.path.split('/')) <= 2 and len(orig.path.split('/')) > 2:
        return True
        
    return False

def check_availability():
    parser = argparse.ArgumentParser()
    parser.add_argument('--university', default=None, help='Filter by University ID')
    args = parser.parse_args()

    SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('EXPO_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('[FATAL] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 1. Fetch all listings where is_available = true
    try:
        query = supabase.table('properties').select('id, external_url').eq('is_available', True)
        if args.university:
            query = query.eq('university', args.university)
            print(f"Checking availability for university: {args.university}")
        else:
            print("Checking availability for ALL listings")
            
        res = query.execute()
        listings = res.data or []
    except Exception as e:
        print(f'[ERROR] Could not fetch listings: {e}')
        return

    print(f'Checking {len(listings)} listings for availability...')
    
    marked_unavailable = 0
    skipped_errors = 0
    checked = 0

    for l in listings:
        url = l['external_url']
        checked += 1
        try:
            r = requests.head(url, headers=HEADERS, timeout=10, allow_redirects=True)
            if r.status_code == 404 or is_redirected_to_homepage(url, r.url):
                print(f'  [UNAVAILABLE] {url}')
                supabase.table('properties').update({'is_available': False}).eq('id', l['id']).execute()
                marked_unavailable += 1
            elif r.status_code >= 500 or r.status_code == 403:
                skipped_errors += 1
        except Exception as e:
            skipped_errors += 1

    print(f'\nSummary:')
    print(f'  Checked:            {checked}')
    print(f'  Marked Unavailable: {marked_unavailable}')
    print(f'  Skipped (Errors):   {skipped_errors}')

if __name__ == '__main__':
    check_availability()
