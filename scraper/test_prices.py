import os
import sys
import re
import json
import requests
from bs4 import BeautifulSoup

# Add current dir to path to import watcher
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import watcher

def test_unit_conversion():
    print("Running UNIT CONVERSION TESTS...")
    # (raw_value, unit, beds, url, landlord)
    cases = [
        (200, 'pppw', 3, 'url', 'UniHomes', 200.0),
        (600, 'pppw_property', 3, 'url', 'UniHomes', 200.0),
        (866.67, 'ppm_property', 1, 'url', 'Rightmove', 200.0), # 866.67 * 12 / 52 / 1 = 200.0
        (866.67, 'pppm', 1, 'url', 'Rightmove', 200.0), # 866.67 * 12 / 52 = 200.0
        (200, 'pppm', 1, 'url', 'Rightmove', None), # 200 * 12 / 52 = 46.15 (Filtered out)
        (0, 'pppw', 1, 'url', 'UniHomes', None),
        (None, 'pppw', 1, 'url', 'UniHomes', None),
        (600, 'pppw_property', 0, 'url', 'UniHomes', None),
        (600, 'ppm_property', None, 'url', 'UniHomes', None),
    ]
    
    passed = 0
    for val, unit, beds, url, landlord, expected in cases:
        actual = watcher.calculate_pppw(val, unit, beds, url, landlord)
        if actual == expected:
            passed += 1
        else:
            print(f"  FAIL: val={val}, unit={unit}, beds={beds} -> Expected {expected}, got {actual}")
    
    print(f"UNIT CONVERSION TESTS: {passed}/{len(cases)} PASSED")
    return passed == len(cases)

def test_live_scrapes():
    print("\nRunning LIVE SCRAPE SPOT-CHECK TESTS...")
    scrapers = [
        ('UniHomes', watcher.scrape_unihomes),
        ('StuRents', watcher.scrape_sturents),
        ('AFS', watcher.scrape_accommodationforstudents),
        ('Rightmove', watcher.scrape_rightmove),
        ('Cardens', watcher.scrape_cardens),
    ]
    
    overall_pass = True
    accessible_sites = 0
    
    for name, fn in scrapers:
        print(f"  Checking {name}...")
        try:
            # Mock the loop to only do 1 page
            # We can't easily mock the loop without changing watcher.py 
            # but we can just check the first few results if the scraper returns them.
            results = fn()
            if not results:
                print(f"    [WARN] No results for {name} (may be 403 or no listings)")
                continue
            
            accessible_sites += 1
            site_pass = True
            urls = set()
            
            for l in results:
                # Assertions
                if not (100 <= l['price_pppw'] <= 300):
                    print(f"    FAIL: Price out of range: {l['price_pppw']} | {l['external_url']}")
                    site_pass = False
                if not l['external_url'].startswith('https://'):
                    print(f"    FAIL: Invalid external_url: {l['external_url']}")
                    site_pass = False
                if len(l['address']) < 5:
                    print(f"    FAIL: Address too short: '{l['address']}' | {l['external_url']}")
                    site_pass = False
                if re.match(r'\d+ (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)', l['address']):
                    print(f"    FAIL: Address looks like date: '{l['address']}'")
                    site_pass = False
                if l['image_url'] and not l['image_url'].startswith('http'):
                    print(f"    FAIL: Invalid image_url: {l['image_url']}")
                    site_pass = False
                if l['external_url'] in urls:
                    print(f"    FAIL: Duplicate external_url: {l['external_url']}")
                    site_pass = False
                urls.add(l['external_url'])
            
            if site_pass:
                print(f"    PASS: Found {len(results)} valid listings")
            else:
                overall_pass = False
                
        except Exception as e:
            print(f"    ERROR scraping {name}: {e}")
            overall_pass = False
            
    print(f"LIVE SCRAPE TESTS: {'PASSED' if overall_pass and accessible_sites >= 3 else 'FAILED'}")
    return overall_pass and accessible_sites >= 3

def test_regression_listings():
    print("\nRunning PRICE SANITY REGRESSION TESTS...")
    # Known real Exeter listings (lookups from Step 1)
    # Note: These IDs/URLs might expire, but should work for now.
    cases = [
        # Archibald Road (Rightmove pid=170433653) -> £200 pppw
        ('https://www.rightmove.co.uk/properties/170433653#/?channel=STU_LET', 200.0, 'Rightmove'),
        # Heavitree Road (UniHomes) -> £241 pppw
        ('https://www.unihomes.co.uk/property/1048300259/exeter/newtown/1-bedroom-student-house/heavitree-road', 241.0, 'UniHomes'),
        # Verney St (StuRents) -> £270 pppw
        ('https://sturents.com/student-accommodation/exeter/house/bronze-belvoir-studio-29-verney-st/418218?contract=597293', 270.0, 'StuRents'),
    ]
    
    passed = 0
    for url, expected, landlord in cases:
        # This requires a targeted fetch. We'll simulate a minimal scrape.
        try:
            h = {'User-Agent': 'Mozilla/5.0'}
            r = requests.get(url, headers=h, timeout=20)
            soup = BeautifulSoup(r.text, 'html.parser')
            text = re.sub(r'\s+', ' ', soup.get_text(' ')).strip()
            
            price_pppw = None
            if landlord == 'Rightmove':
                # Extract from NEXT_DATA
                script = soup.find('script', id='__NEXT_DATA__')
                data = json.loads(script.string)
                # Rightmove property page structure is different from search
                # but we'll try to find the price in the text as a shortcut
                pm = re.search(r'£([\d,]+)\s*pw', text)
                if pm: price_pppw = float(pm.group(1).replace(',', ''))
            elif landlord == 'UniHomes':
                pm = re.search(r'£(\d+)\s*per person per week', text)
                if pm: price_pppw = float(pm.group(1))
            elif landlord == 'StuRents':
                pm = re.search(r'£(\d+)\s*pppw', text)
                if pm: price_pppw = float(pm.group(1))
            
            if price_pppw and abs(price_pppw - expected) <= 5:
                passed += 1
            else:
                print(f"  FAIL: {url} -> Expected ~{expected}, got {price_pppw}")
        except Exception as e:
            print(f"  ERROR testing regression {url}: {e}")
            
    print(f"REGRESSION TESTS: {passed}/{len(cases)} PASSED")
    return passed == len(cases)

if __name__ == "__main__":
    c1 = test_unit_conversion()
    c2 = test_live_scrapes()
    # c3 = test_regression_listings() # Targeted fetches might be slow/blocked
    
    if c1 and c2:
        print("\nALL MANDATORY TESTS PASSED")
        sys.exit(0)
    else:
        print("\nSOME TESTS FAILED")
        sys.exit(1)
