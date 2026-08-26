from sqlalchemy.orm import Session
from app.models.city import City
from app.models.road import Road

# 1. The Official Master Logistics Template
MASTER_LOGISTICS_HUBS = [
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

# (Source Hub Name, Destination Hub Name, Distance in km, Is Bidirectional)
MASTER_FREIGHT_CORRIDORS = [
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


def seed_user_workspace(user_id: int, db: Session):
    """
    Clones the complete official master network into a specific user's private sandbox.
    """
    # 1. Add Cities for this user
    city_map = {}
    for hub in MASTER_LOGISTICS_HUBS:
        city = City(
            user_id=user_id,
            name=hub["name"],
            latitude=hub["latitude"],
            longitude=hub["longitude"],
        )
        db.add(city)
        db.flush()  # Populates city.id before committing
        city_map[city.name] = city.id

    # 2. Add Connected Freight Corridors for this user
    for src_name, dst_name, distance, is_bidi in MASTER_FREIGHT_CORRIDORS:
        if src_name in city_map and dst_name in city_map:
            road = Road(
                user_id=user_id,
                source_city_id=city_map[src_name],
                destination_city_id=city_map[dst_name],
                distance=distance,
                is_bidirectional=is_bidi,
            )
            db.add(road)

    db.commit()


def reset_user_workspace(user_id: int, db: Session):
    """
    Wipes the user's custom cities/roads and re-clones the official master template.
    """
    # Delete current user's roads and cities
    db.query(Road).filter(Road.user_id == user_id).delete(synchronize_session=False)
    db.query(City).filter(City.user_id == user_id).delete(synchronize_session=False)
    db.commit()

    # Re-seed the fresh master network
    seed_user_workspace(user_id, db)
