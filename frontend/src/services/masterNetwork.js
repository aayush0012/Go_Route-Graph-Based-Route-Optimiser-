export const MASTER_LOGISTICS_HUBS = [
    { name: "Delhi NCR (North Mega-Hub)", latitude: 28.6139, longitude: 77.2090 },
    { name: "Jaipur (Western Transit Hub)", latitude: 26.9124, longitude: 75.7873 },
    { name: "Lucknow (Central Sorting)", latitude: 26.8467, longitude: 80.9462 },
    { name: "Ahmedabad (Logistics Park)", latitude: 23.0225, longitude: 72.5714 },
    { name: "Mumbai (West Port & Hub)", latitude: 19.0760, longitude: 72.8777 },
    { name: "Pune (Auto & Cargo Hub)", latitude: 18.5204, longitude: 73.8567 },
    { name: "Nagpur (Central Freight Zero-Mile)", latitude: 21.1458, longitude: 79.0882 },
    { name: "Hyderabad (Deccan Distribution)", latitude: 17.3850, longitude: 78.4867 },
    { name: "Bengaluru (South Tech & E-Com Hub)", latitude: 12.9716, longitude: 77.5946 },
    { name: "Chennai (East Port Terminal)", latitude: 13.0827, longitude: 80.2707 },
    { name: "Kolkata (Eastern Gateway)", latitude: 22.5726, longitude: 88.3639 },
    { name: "Varanasi (Inland Cargo Port)", latitude: 25.3176, longitude: 82.9739 },
];

export const MASTER_FREIGHT_CORRIDORS = [
    { source: "Delhi NCR (North Mega-Hub)", destination: "Jaipur (Western Transit Hub)", distance: 270, is_bidirectional: true },
    { source: "Delhi NCR (North Mega-Hub)", destination: "Lucknow (Central Sorting)", distance: 530, is_bidirectional: true },
    { source: "Delhi NCR (North Mega-Hub)", destination: "Nagpur (Central Freight Zero-Mile)", distance: 1080, is_bidirectional: true },
    { source: "Jaipur (Western Transit Hub)", destination: "Ahmedabad (Logistics Park)", distance: 670, is_bidirectional: true },
    { source: "Ahmedabad (Logistics Park)", destination: "Mumbai (West Port & Hub)", distance: 525, is_bidirectional: true },
    { source: "Mumbai (West Port & Hub)", destination: "Pune (Auto & Cargo Hub)", distance: 150, is_bidirectional: true },
    { source: "Pune (Auto & Cargo Hub)", destination: "Nagpur (Central Freight Zero-Mile)", distance: 710, is_bidirectional: true },
    { source: "Pune (Auto & Cargo Hub)", destination: "Bengaluru (South Tech & E-Com Hub)", distance: 840, is_bidirectional: true },
    { source: "Nagpur (Central Freight Zero-Mile)", destination: "Hyderabad (Deccan Distribution)", distance: 500, is_bidirectional: true },
    { source: "Nagpur (Central Freight Zero-Mile)", destination: "Varanasi (Inland Cargo Port)", distance: 680, is_bidirectional: true },
    { source: "Lucknow (Central Sorting)", destination: "Varanasi (Inland Cargo Port)", distance: 310, is_bidirectional: true },
    { source: "Varanasi (Inland Cargo Port)", destination: "Kolkata (Eastern Gateway)", distance: 680, is_bidirectional: true },
    { source: "Hyderabad (Deccan Distribution)", destination: "Bengaluru (South Tech & E-Com Hub)", distance: 570, is_bidirectional: true },
    { source: "Hyderabad (Deccan Distribution)", destination: "Chennai (East Port Terminal)", distance: 630, is_bidirectional: true },
    { source: "Bengaluru (South Tech & E-Com Hub)", destination: "Chennai (East Port Terminal)", distance: 350, is_bidirectional: true },
    { source: "Chennai (East Port Terminal)", destination: "Kolkata (Eastern Gateway)", distance: 1650, is_bidirectional: true },
];

export const restoreMasterNetwork = async (api) => {
    try {
        await api.post("/cities/reset-to-master");
        return true;
    } catch (err) {
        console.warn("Bulk reset endpoint unavailable, executing client-side restore fallback...", err);

        // 1. Fetch and delete existing cities
        try {
            const existingCitiesRes = await api.get("/cities/");
            const existingCities = Array.isArray(existingCitiesRes.data) ? existingCitiesRes.data : [];
            for (const city of existingCities) {
                try {
                    await api.delete(`/cities/${city.id}`);
                } catch (delErr) {
                    console.error("Error deleting city:", delErr);
                }
            }
        } catch (fetchErr) {
            console.error("Error fetching cities to delete:", fetchErr);
        }

        // 2. Create Master Hubs
        const cityIdMap = {};
        for (const hub of MASTER_LOGISTICS_HUBS) {
            try {
                const res = await api.post("/cities/", {
                    name: hub.name,
                    latitude: hub.latitude,
                    longitude: hub.longitude,
                });
                if (res.data && res.data.id) {
                    cityIdMap[hub.name] = res.data.id;
                }
            } catch (addCityErr) {
                console.error("Error creating hub:", addCityErr);
            }
        }

        // 3. Create Connected Corridors
        for (const corridor of MASTER_FREIGHT_CORRIDORS) {
            const sId = cityIdMap[corridor.source];
            const dId = cityIdMap[corridor.destination];
            if (sId && dId) {
                try {
                    await api.post("/roads/", {
                        source_city_id: sId,
                        destination_city_id: dId,
                        distance: corridor.distance,
                        is_bidirectional: corridor.is_bidirectional,
                    });
                } catch (addRoadErr) {
                    console.error("Error creating corridor:", addRoadErr);
                }
            }
        }

        return true;
    }
};
