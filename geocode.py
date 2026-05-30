import csv, time, json
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

geolocator = Nominatim(user_agent="seed-map-usa-geocoder")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.1)

rows = []
with open("red-pins.csv", "r", encoding="cp1252") as f:
    reader = csv.DictReader(f)
    for r in reader:
        if not r.get("name", "").strip():
            continue
        rows.append(r)

print(f"Geocoding {len(rows)} locations...")
results = []
failed = []

for i, row in enumerate(rows):
    name = row["name"].strip()
    city = row.get("city", "").strip()
    state = row.get("state", "").strip()
    zip_code = row.get("zip_code", "").strip()
    street = row.get("street_address", "").strip()
    is_online = row.get("location", "").strip().lower() == "website"

    # Build query — try full address first, fall back to city/state
    queries = []
    if street and street != "NA" and not is_online:
        queries.append(f"{street}, {city}, {state} {zip_code}")
    if city and city != "NA":
        queries.append(f"{city}, {state}")
    if state:
        queries.append(f"{state}, US")

    lat, lng = None, None
    for q in queries:
        try:
            loc = geocode(q)
            if loc:
                lat, lng = loc.latitude, loc.longitude
                break
        except Exception as e:
            print(f"  Error geocoding '{q}': {e}")
            time.sleep(2)

    status = "OK" if lat else "FAILED"
    if not lat:
        failed.append(name)
    print(f"  [{i+1}/{len(rows)}] {status}: {name} ({city}, {state})")

    row["lat"] = lat
    row["lng"] = lng
    results.append(row)

# Write enriched CSV
fieldnames = list(results[0].keys())
with open("red-pins-geo.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(results)

# Write JSON for the map
json_data = []
for r in results:
    if not r["lat"]:
        continue
    json_data.append({
        "name": r["name"].strip(),
        "location": r.get("location", "").strip(),
        "type": r.get("type", "").strip(),
        "url": r.get("url", "").strip(),
        "address": r.get("street_address", "").strip(),
        "city": r.get("city", "").strip(),
        "state": r.get("state", "").strip(),
        "zip": r.get("zip_code", "").strip(),
        "phone": r.get("phone", "").strip(),
        "email": r.get("email", "").strip(),
        "hours": r.get("hours", "").strip(),
        "order": r.get("order", "").strip(),
        "delivery": r.get("delivery", "").strip(),
        "lat": r["lat"],
        "lng": r["lng"],
        "online": r.get("location", "").strip().lower() == "website"
    })

with open("pins.json", "w", encoding="utf-8") as f:
    json.dump(json_data, f, indent=2)

print(f"\nDone! {len(json_data)} geocoded, {len(failed)} failed.")
if failed:
    print("Failed:", failed)
