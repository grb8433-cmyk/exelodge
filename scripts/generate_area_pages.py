import os

AREAS = {
  'exeter': {
    'color': '#0B6E4F',
    'uni': 'University of Exeter',
    'campuses': 'Streatham and St Lukes campus',
    'areas': [
      ('Pennsylvania',  'st-james heavitree newtown', 'the closest student area to Streatham Campus, about 10 minutes walk'),
      ('St James',      'pennsylvania heavitree newtown', 'a popular student area close to Streatham Campus'),
      ('Heavitree',     'st-james newtown mount-pleasant', 'a popular area known for value-for-money student houses'),
      ('Newtown',       'heavitree mount-pleasant st-james', 'an affordable area popular with University of Exeter students'),
      ('Mount Pleasant','newtown heavitree haldon', 'a quiet residential area close to the city centre'),
      ('Haldon',        'mount-pleasant newtown st-davids', 'an area offering good value student houses near the city'),
      ('City Centre',   'st-davids st-leonards riverside', 'a central location close to Exeter city centre amenities'),
      ('St Davids',     'city-centre st-leonards pennsylvania', 'an area close to Exeter St Davids railway station'),
      ('St Leonards',   'st-davids city-centre riverside', 'a leafy residential area south of the city centre'),
      ('Riverside',     'st-leonards city-centre st-davids', 'a riverside location with good transport links into the city'),
    ]
  },
  'bristol': {
    'color': '#BE0F34',
    'uni': 'University of Bristol and UWE Bristol',
    'campuses': 'UoB and UWE campus',
    'areas': [
      ('Clifton',       'redland cotham stoke-bishop', 'the closest area to the UoB campus, about 5 minutes walk'),
      ('Redland',       'clifton cotham bishopston', 'one of the most popular student areas in Bristol'),
      ('Cotham',        'redland clifton bishopston', 'a lively area between the UoB campus and Bristol city centre'),
      ('Stokes Croft',  'cotham bishopston city-centre', 'a vibrant area popular with students and young professionals'),
      ('Southville',    'city-centre stokes-croft horfield', 'a trendy south Bristol neighbourhood with good transport links'),
      ('Horfield',      'bishopston filton southville', 'popular with UWE students and offering good value student houses'),
      ('Bishopston',    'redland horfield cotham', 'a family-friendly area close to Redland and Cotham'),
      ('Filton',        'horfield stoke-bishop', 'convenient for UWE Bristol Frenchay Campus students'),
      ('Stoke Bishop',  'clifton filton', 'a leafy suburb close to the UoB campus with larger student houses'),
      ('City Centre',   'stokes-croft southville clifton', 'a central Bristol location close to Solent University and city amenities'),
    ]
  },
  'southampton': {
    'color': '#0B6E4F',
    'uni': 'University of Southampton and Solent University',
    'campuses': 'Highfield and Solent campus',
    'areas': [
      ('Portswood',     'highfield swaythling st-denys', 'the main student area in Southampton, close to Highfield Campus'),
      ('Highfield',     'portswood swaythling bassett', 'directly adjacent to the University of Southampton Highfield Campus'),
      ('Swaythling',    'portswood highfield st-denys', 'a popular student area with good bus links to campus'),
      ('Bassett',       'highfield swaythling freemantle', 'a quieter residential area close to Highfield Campus'),
      ('Freemantle',    'bassett shirley bevois-valley', 'an affordable student area west of Southampton city centre'),
      ('Bevois Valley', 'freemantle st-denys city-centre', 'a vibrant inner-city area popular with Southampton students'),
      ('St Denys',      'portswood swaythling bevois-valley', 'close to Portswood and St Denys railway station'),
      ('Shirley',       'freemantle city-centre bassett', 'a suburban area with good value student houses'),
      ('Bitterne',      'st-denys swaythling', 'a residential area east of the city with affordable student rents'),
      ('City Centre',   'bevois-valley shirley freemantle', 'a central Southampton location close to Solent University'),
    ]
  }
}


def slug(name):
    return name.lower().replace(' ', '-')


def make_page(city, cfg, area_name, nearby_slugs, area_desc):
    area_slug = slug(area_name)
    city_title = city.capitalize()
    nearby_links = ' '.join(
        '<a href="/{city}/{s}" style="color:{color}">{label}</a>'.format(
            city=city, s=s, color=cfg['color'], label=s.replace('-', ' ').title()
        )
        for s in nearby_slugs.split()
    )

    return '''<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <link rel="canonical" href="https://exelodge.uk/{city}/{area_slug}" />
    <title>Student Houses in {area_name}, {city_title} 2025/26 | ExeLodge</title>
    <meta name="description" content="Find verified student houses in {area_name}, {city_title} for 2025/26. Browse listings near the {uni} with prices per person per week, campus distance and bills-inclusive options — free, no sign-up." />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="Student Houses in {area_name}, {city_title} 2025/26 | ExeLodge" />
    <meta property="og:description" content="Find verified student houses in {area_name}, {city_title}. Compare prices, campus distance and landlord reviews — free, no sign-up." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://exelodge.uk/{city}/{area_slug}" />
    <meta property="og:site_name" content="ExeLodge" />
    <meta property="og:locale" content="en_GB" />
    <script type="application/ld+json">
    [
      {{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "ExeLodge — Student Houses in {area_name}, {city_title}",
        "description": "Find verified student houses in {area_name}, {city_title} near the {uni}. Compare prices per person per week, campus distance and bills-inclusive options.",
        "url": "https://exelodge.uk/{city}/{area_slug}",
        "areaServed": {{"@type": "Place", "name": "{area_name}, {city_title}"}},
        "serviceType": "Student Housing Search"
      }},
      {{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {{"@type": "ListItem", "position": 1, "name": "ExeLodge", "item": "https://exelodge.uk/"}},
          {{"@type": "ListItem", "position": 2, "name": "Student Houses in {city_title}", "item": "https://exelodge.uk/{city}"}},
          {{"@type": "ListItem", "position": 3, "name": "Student Houses in {area_name}", "item": "https://exelodge.uk/{city}/{area_slug}"}}
        ]
      }}
    ]
    </script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-8MTEFEN65Q"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-8MTEFEN65Q');</script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script>fetch('/').then(function(r){{return r.text();}}).then(function(h){{var m=h.match(/src="(\\/_expo\\/static\\/js\\/web\\/AppEntry-[^"]+\\.js)"/);if(m){{var s=document.createElement('script');s.src=m[1];s.defer=true;document.head.appendChild(s);}}}}).catch(function(){{}});</script>
    <style>#root,body,html{{width:100%;-webkit-overflow-scrolling:touch;margin:0;padding:0;height:100%;overflow:hidden;}}#root{{display:flex;flex-direction:column;}}</style>
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>
    <noscript>
      <div style="font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:40px 20px;color:#111;line-height:1.7;">
        <nav style="font-size:14px;color:#555;margin-bottom:24px;">
          <a href="/" style="color:{color};">ExeLodge</a> &rsaquo;
          <a href="/{city}" style="color:{color};">Student Houses in {city_title}</a> &rsaquo;
          {area_name}
        </nav>
        <h1>Student Houses in {area_name}, {city_title} 2025/26</h1>
        <p><strong>{area_name}</strong> is {area_desc}. ExeLodge lists verified student houses and flats in {area_name} from multiple sources, updated daily. Compare prices per person per week, distance to {campuses}, bills-inclusive options and real landlord reviews — free, no account required.</p>
        <h2>Browse Student Houses in {area_name}</h2>
        <p><a href="https://exelodge.uk/{city}/{area_slug}" style="background:{color};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View {area_name} Listings &rarr;</a></p>
        <h2>Nearby Areas in {city_title}</h2>
        <p>Also searching nearby? Browse student houses in {nearby_links}.</p>
        <p><a href="/{city}" style="color:{color};">View all student houses in {city_title} &rarr;</a></p>
      </div>
    </noscript>
    <div id="root"></div>
  </body>
</html>'''.format(
        city=city,
        area_slug=area_slug,
        area_name=area_name,
        city_title=city_title,
        uni=cfg['uni'],
        campuses=cfg['campuses'],
        color=cfg['color'],
        area_desc=area_desc,
        nearby_links=nearby_links,
    )


created = 0
for city, cfg in AREAS.items():
    for area_name, nearby_slugs, area_desc in cfg['areas']:
        area_slug = slug(area_name)
        dir_path = os.path.join('public', city, area_slug)
        os.makedirs(dir_path, exist_ok=True)
        content = make_page(city, cfg, area_name, nearby_slugs, area_desc)
        with open(os.path.join(dir_path, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(content)
        created += 1

print(f'Created {created} area pages')
