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

// Custom Leaflet DivIcon generator for minimal dot markers
const createCustomIcon = (label, type = "city") => {
    let color = "#3b82f6"; // Blue default

    if (type === "source") {
        color = "#10b981"; // Emerald green
    } else if (type === "destination") {
        color = "#ef4444"; // Red
    } else if (type === "stop") {
        color = "#f59e0b"; // Amber
    }

    return L.divIcon({
        className: "custom-map-pin",
        html: `
            <div class="pin-wrapper ${type}">
                <div class="dot-marker" style="background-color: ${color}"></div>
                <div class="pin-label">${label}</div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -14],
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

    // Filter cities with valid lat/lng
    const validCities = safeCities.filter(
        (c) => c && c.latitude !== null && c.longitude !== null && !isNaN(c.latitude) && !isNaN(c.longitude)
    );

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
