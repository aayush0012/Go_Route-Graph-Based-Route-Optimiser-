"""
E-Commerce Logistics & Freight Corridors Dataset Seeder for GoRoute
Provides a realistic supply chain hub graph across major distribution centers.
"""

from app.database.database import SessionLocal
from app.models.city import City
from app.models.road import Road
from app.services.cache_service import invalidate_all_caches

LOGISTICS_HUBS = [
    {"name": "Delhi NCR (North Mega-Hub)", "latitude": 28.6139, "longitude": 77.2090},
    {"name": "Jaipur (Western Transit Hub)", "latitude": 26.9124, "longitude": 75.7873},
    {"name": "Lucknow (Central Sorting)", "latitude": 26.8467, "longitude": 80.9462},
    {"name": "Ahmedabad (Logistics Park)", "latitude": 23.0225, "longitude": 72.5714},
    {"name": "Mumbai (West Port & Hub)", "latitude": 19.0760, "longitude": 72.8777},
    {"name": "Pune (Auto & Cargo Hub)", "latitude": 18.5204, "longitude": 73.8567},
    {"name": "Nagpur (Central Freight Zero-Mile)", "latitude": 21.1458, "longitude": 79.0882},
    {"name": "Hyderabad (Deccan Distribution)", "latitude": 17.3850, "longitude": 78.4867},
    {"name": "Bengaluru (South Tech & E-Com Hub)", "latitude": 12.9716, "longitude": 77.5946},
    {"name": "Chennai (East Port Terminal)", "latitude": 13.0827, "longitude": 80.2707},
    {"name": "Kolkata (Eastern Gateway)", "latitude": 22.5726, "longitude": 88.3639},
    {"name": "Varanasi (Inland Cargo Port)", "latitude": 25.3176, "longitude": 82.9739},
]

# (Source Hub, Destination Hub, Distance in km, Is Bidirectional)
FREIGHT_CORRIDORS = [
    ("Delhi NCR (North Mega-Hub)", "Jaipur (Western Transit Hub)", 270, True),
    ("Delhi NCR (North Mega-Hub)", "Lucknow (Central Sorting)", 530, True),
    ("Delhi NCR (North Mega-Hub)", "Nagpur (Central Freight Zero-Mile)", 1080, True),
    ("Jaipur (Western Transit Hub)", "Ahmedabad (Logistics Park)", 670, True),
    ("Ahmedabad (Logistics Park)", "Mumbai (West Port & Hub)", 525, True),
    ("Mumbai (West Port & Hub)", "Pune (Auto & Cargo Hub)", 150, True),
    ("Pune (Auto & Cargo Hub)", "Nagpur (Central Freight Zero-Mile)", 710, True),
    ("Pune (Auto & Cargo Hub)", "Bengaluru (South Tech & E-Com Hub)", 840, True),
    ("Nagpur (Central Freight Zero-Mile)", "Hyderabad (Deccan Distribution)", 500, True),
    ("Nagpur (Central Freight Zero-Mile)", "Varanasi (Inland Cargo Port)", 680, True),
    ("Lucknow (Central Sorting)", "Varanasi (Inland Cargo Port)", 310, True),
    ("Varanasi (Inland Cargo Port)", "Kolkata (Eastern Gateway)", 680, True),
    ("Hyderabad (Deccan Distribution)", "Bengaluru (South Tech & E-Com Hub)", 570, True),
    ("Hyderabad (Deccan Distribution)", "Chennai (East Port Terminal)", 630, True),
    ("Bengaluru (South Tech & E-Com Hub)", "Chennai (East Port Terminal)", 350, True),
    ("Chennai (East Port Terminal)", "Kolkata (Eastern Gateway)", 1650, True),
]


def seed_dataset():
    db = SessionLocal()
    try:
        print("[+] Seeding GoRoute Logistics Dataset...")

        # 1. Clear old roads and test cities cleanly
        db.query(Road).delete()
        db.query(City).delete()
        db.commit()

        # 2. Add realistic Logistics Hubs (Nodes)
        city_map = {}
        for hub_data in LOGISTICS_HUBS:
            city = City(
                name=hub_data["name"],
                latitude=hub_data["latitude"],
                longitude=hub_data["longitude"],
            )
            db.add(city)
            db.commit()
            db.refresh(city)
            city_map[city.name] = city.id
            print(f"  [+] Added Node: {city.name} (ID: {city.id})")

        # 3. Add realistic Corridors (Edges)
        for src_name, dst_name, distance, is_bidi in FREIGHT_CORRIDORS:
            if src_name in city_map and dst_name in city_map:
                road = Road(
                    source_city_id=city_map[src_name],
                    destination_city_id=city_map[dst_name],
                    distance=distance,
                    is_bidirectional=is_bidi,
                )
                db.add(road)
                print(f"  [+] Connected Corridor: {src_name} <--> {dst_name} ({distance} km)")

        db.commit()

        # 4. Invalidate Redis graph cache to refresh memory immediately
        try:
            invalidate_all_caches()
            print("  [+] In-memory cache invalidated.")
        except Exception as e:
            print(f"  (Cache notice: {e})")

        print("[SUCCESS] Dataset successfully seeded with 12 Hubs and 16 Freight Corridors!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding dataset: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_dataset()
