import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./RouteMap.css";

// Helper component to adjust map bounds automatically when markers or routes change
function MapBoundsUpdater({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const validPoints = points.filter(p => p && !isNaN(p[0]) && !isNaN(p[1]));
            if (validPoints.length > 0) {
                const bounds = L.latLngBounds(validPoints);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
            }
        }
    }, [points, map]);
    return null;
}

const KNOWN_CITY_COORDS = {
    "delhi": [28.6139, 77.2090],
    "new delhi": [28.6139, 77.2090],
    "mumbai": [19.0760, 72.8777],
    "bengaluru": [12.9716, 77.5946],
    "bangalore": [12.9716, 77.5946],
    "chennai": [13.0827, 80.2707],
    "kolkata": [22.5726, 88.3639],
    "hyderabad": [17.3850, 78.4867],
    "pune": [18.5204, 73.8567],
    "jaipur": [26.9124, 75.7873],
    "ahmedabad": [23.0225, 72.5714],
    "mysore": [12.2958, 76.6394],
    "mysuru": [12.2958, 76.6394],
    "chandigarh": [30.7333, 76.7794],
    "surat": [21.1702, 72.8311],
    "lucknow": [26.8467, 80.9462],
    "agra": [27.1767, 78.0081],
    "varanasi": [25.3176, 82.9739],
    "goa": [15.2993, 74.1240],
    "kochi": [9.9312, 76.2673],
    "indore": [22.7196, 75.8577],
    "bhopal": [23.2599, 77.4126],
    "patna": [25.5941, 85.1376],
    "nagpur": [21.1458, 79.0882],
    "vadodara": [22.3072, 73.1812],
    "visakhapatnam": [17.6868, 83.2185],
    "coimbatore": [11.0168, 76.9558],
    "madurai": [9.9252, 78.1198],
    "guwahati": [26.1445, 91.7362],
    "ranchi": [23.3441, 85.3096],
    "shimla": [31.1048, 77.1734],
    "dehradun": [30.3165, 78.0322],
    "amritsar": [31.6340, 74.8723],
    "jodhpur": [26.2389, 73.0243],
    "udaipur": [24.5854, 73.7125],
    "kanpur": [26.4499, 80.3319],
    "nashik": [19.9975, 73.7898],
    "thiruvananthapuram": [8.5241, 76.9366],
};

// Custom Leaflet DivIcon generator for prominent city pin badges
const createCustomIcon = (label, type = "city") => {
    let color = "#2563eb";
    let badgeBg = "#1d4ed8";
    let iconEmoji = "🏙️";

    if (type === "source") {
        color = "#10b981";
        badgeBg = "#047857";
        iconEmoji = "🟢";
    } else if (type === "destination") {
        color = "#ef4444";
        badgeBg = "#b91c1c";
        iconEmoji = "🔴";
    } else if (type === "stop") {
        color = "#f59e0b";
        badgeBg = "#b45309";
        iconEmoji = "🟠";
    }

    return L.divIcon({
        className: "custom-map-pin-container",
        html: `
            <div class="pin-wrapper ${type}">
                <div class="pin-badge" style="background-color: ${badgeBg}">
                    <span class="pin-emoji">${iconEmoji}</span>
                    <span class="pin-text">${label}</span>
                </div>
                <div class="pin-stem"></div>
                <div class="pin-dot" style="background-color: ${color}"></div>
            </div>
        `,
        iconSize: [140, 50],
        iconAnchor: [70, 48],
        popupAnchor: [0, -48],
    });
};

function RouteMap({
    cities = [],
    roads = [],
    sourceCityId,
    destinationCityId,
    stopCityIds = [],
    routeSegments = [],
    routePathNodes = [],
    optimalPathNodes = [],
    onSelectCity,
}) {
    const safeCities = Array.isArray(cities) ? cities : [];
    const safeRoads = Array.isArray(roads) ? roads : [];
    const safePathNodes = Array.isArray(routePathNodes) ? routePathNodes : [];
    const safeOptimalNodes = Array.isArray(optimalPathNodes) ? optimalPathNodes : [];

    // Filter cities with valid lat/lng or fallback lookup
    const validCities = safeCities.map((c) => {
        if (!c) return null;
        let lat = c.latitude;
        let lng = c.longitude;

        if ((lat === null || lng === null || isNaN(lat) || isNaN(lng)) && c.name) {
            const key = c.name.toLowerCase().trim();
            if (KNOWN_CITY_COORDS[key]) {
                [lat, lng] = KNOWN_CITY_COORDS[key];
            }
        }

        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            return { ...c, latitude: Number(lat), longitude: Number(lng) };
        }
        return null;
    }).filter(Boolean);

    // Default map center (India center if fallback)
    const defaultCenter = validCities.length > 0
        ? [validCities[0].latitude, validCities[0].longitude]
        : [20.5937, 78.9629];

    // Build route polyline coordinates from routePathNodes or routeSegments
    const routePolylineCoords = safePathNodes
        .filter((n) => n && n.lat !== null && n.lng !== null)
        .map((n) => [n.lat, n.lng]);

    // Build optimal route polyline coordinates
    const optimalPolylineCoords = safeOptimalNodes
        .filter((n) => n && n.lat !== null && n.lng !== null)
        .map((n) => [n.lat, n.lng]);

    // Gather points to fit bounds
    const allCoords = routePolylineCoords.length > 0
        ? routePolylineCoords
        : (optimalPolylineCoords.length > 0 ? optimalPolylineCoords : validCities.map((c) => [c.latitude, c.longitude]));

    // Build road network lines
    const cityMapById = {};
    validCities.forEach((c) => {
        cityMapById[c.id] = c;
    });

    const networkRoadLines = [];
    safeRoads.forEach((road) => {
        const src = cityMapById[road.source_city_id];
        const dst = cityMapById[road.destination_city_id];
        if (src && dst) {
            networkRoadLines.push({
                id: road.id,
                positions: [
                    [src.latitude, src.longitude],
                    [dst.latitude, dst.longitude],
                ],
                distance: road.distance,
                isBidirectional: road.is_bidirectional,
                sourceName: src.name,
                destName: dst.name,
            });
        }
    });

    return (
        <div className="route-map-container">
            <div className="map-legend-bar">
                <span className="legend-item"><span className="legend-dot source"></span> Start</span>
                <span className="legend-item"><span className="legend-dot stop"></span> Stop</span>
                <span className="legend-item"><span className="legend-dot destination"></span> End</span>
                <span className="legend-item"><span className="legend-dot city"></span> Network City</span>
                {routePolylineCoords.length > 0 && (
                    <span className="legend-item route-highlight-legend">🔵 Your Path</span>
                )}
                {optimalPolylineCoords.length > 0 && (
                    <span className="legend-item optimal-highlight-legend" style={{ color: '#10b981', fontWeight: 600 }}>🟢 Shortest Direct Path</span>
                )}
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={5}
                scrollWheelZoom={true}
                className="leaflet-map-view"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBoundsUpdater points={allCoords} />

                {/* Render background road network lines */}
                {networkRoadLines.map((road) => (
                    <Polyline
                        key={`road-${road.id}`}
                        positions={road.positions}
                        pathOptions={{
                            color: "#94a3b8",
                            weight: 2,
                            dashArray: "4, 6",
                            opacity: 0.6,
                        }}
                    >
                        <Popup>
                            <div className="map-popup">
                                <strong>🛣️ {road.sourceName} ➔ {road.destName}</strong>
                                <div>Distance: {road.distance} km</div>
                                <div>Type: {road.isBidirectional ? "Bidirectional" : "One-Way"}</div>
                            </div>
                        </Popup>
                    </Polyline>
                ))}

                {/* Render direct optimal route polyline (dashed green) */}
                {optimalPolylineCoords.length > 1 && (
                    <Polyline
                        positions={optimalPolylineCoords}
                        pathOptions={{
                            color: "#10b981",
                            weight: 4,
                            dashArray: "8, 8",
                            opacity: 0.95,
                            lineJoin: "round",
                        }}
                    />
                )}

                {/* Render active computed user route path polyline - simple, normal solid line */}
                {routePolylineCoords.length > 1 && (
                    <Polyline
                        positions={routePolylineCoords}
                        pathOptions={{
                            color: "#2563eb",
                            weight: 4,
                            opacity: 0.9,
                            lineJoin: "round",
                            lineCap: "round",
                        }}
                    />
                )}

                {/* Render city markers */}
                {validCities.map((city) => {
                    let pinType = "city";
                    if (Number(city.id) === Number(sourceCityId)) {
                        pinType = "source";
                    } else if (Number(city.id) === Number(destinationCityId)) {
                        pinType = "destination";
                    } else if (stopCityIds.some((sId) => Number(sId) === Number(city.id))) {
                        pinType = "stop";
                    }

                    return (
                        <Marker
                            key={`city-marker-${city.id}`}
                            position={[city.latitude, city.longitude]}
                            icon={createCustomIcon(city.name, pinType)}
                        >
                            <Popup>
                                <div className="map-popup">
                                    <h3>🏙️ {city.name}</h3>
                                    <p className="coords-text">
                                        Lat: {city.latitude.toFixed(4)}, Lng: {city.longitude.toFixed(4)}
                                    </p>
                                    {onSelectCity && (
                                        <div className="popup-actions">
                                            <button
                                                className="btn-select-start"
                                                onClick={() => onSelectCity(city.id, "source")}
                                            >
                                                Set Start 🟢
                                            </button>
                                            <button
                                                className="btn-select-end"
                                                onClick={() => onSelectCity(city.id, "destination")}
                                            >
                                                Set End 🔴
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

export default RouteMap;
