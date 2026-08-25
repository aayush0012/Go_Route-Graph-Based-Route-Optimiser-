import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./RouteMap.css";

// Helper component to auto-focus bounds on the active route or all points
function MapBoundsUpdater({ routePoints, allPoints }) {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const targetPoints = routePoints && routePoints.length > 0 ? routePoints : allPoints;
        if (targetPoints && targetPoints.length > 0) {
            const validPoints = targetPoints.filter(p => p && !isNaN(p[0]) && !isNaN(p[1]));
            if (validPoints.length > 0) {
                const bounds = L.latLngBounds(validPoints);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
            }
        }
    }, [routePoints, allPoints, map]);
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

// Node Marker Generator: ONLY active route nodes have special colors
const createCustomIcon = (label, type = "unselected") => {
    const shortLabel = label.split("(")[0].trim();

    if (type === "unselected") {
        return L.divIcon({
            className: "unselected-node-container",
            html: `
                <div class="node-marker-wrapper unselected" title="${shortLabel}">
                    <div class="unselected-dot"></div>
                </div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            popupAnchor: [0, -8],
        });
    }

    let specialBadge = "";
    if (type === "source") {
        specialBadge = `<span class="badge-tag source-tag">START</span>`;
    } else if (type === "destination") {
        specialBadge = `<span class="badge-tag dest-tag">END</span>`;
    } else if (type === "stop") {
        specialBadge = `<span class="badge-tag stop-tag">STOP</span>`;
    } else if (type === "path-node") {
        specialBadge = `<span class="badge-tag path-tag">VIA</span>`;
    }

    return L.divIcon({
        className: "compact-node-icon-container",
        html: `
            <div class="node-marker-wrapper ${type}">
                <div class="node-halo">
                    <div class="node-dot">
                        <span class="inner-core"></span>
                    </div>
                </div>
                <div class="node-label-container">
                    ${specialBadge}
                    <span class="node-label">${shortLabel}</span>
                </div>
            </div>
        `,
        iconSize: [90, 36],
        iconAnchor: [45, 10],
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
            return { ...c, latitude: lat, longitude: lng };
        }
        return null;
    }).filter(Boolean);

    const cityMap = {};
    validCities.forEach(c => {
        cityMap[c.id] = c;
    });

    const hasActiveRoute = safePathNodes.length > 0;
    const pathCityIds = new Set(safePathNodes.map(n => Number(n.id)));
    const pathCityNames = new Set(safePathNodes.map(n => n.name ? n.name.toLowerCase().trim() : ""));

    const allRoadPolylines = safeRoads.map((road) => {
        const src = cityMap[road.source_city_id];
        const dst = cityMap[road.destination_city_id];
        if (src && dst) {
            return {
                id: road.id,
                distance: road.distance,
                positions: [
                    [src.latitude, src.longitude],
                    [dst.latitude, dst.longitude],
                ],
            };
        }
        return null;
    }).filter(Boolean);

    const calculatedRoutePolylines = [];
    const routePoints = [];

    if (routeSegments && routeSegments.length > 0) {
        routeSegments.forEach((seg) => {
            if (seg.source_coords && seg.dest_coords) {
                calculatedRoutePolylines.push([
                    seg.source_coords,
                    seg.dest_coords,
                ]);
                routePoints.push(seg.source_coords);
                routePoints.push(seg.dest_coords);
            }
        });
    } else if (safePathNodes.length >= 2) {
        for (let i = 0; i < safePathNodes.length - 1; i++) {
            const n1 = safePathNodes[i];
            const n2 = safePathNodes[i + 1];
            if (n1 && n2 && n1.lat && n1.lng && n2.lat && n2.lng) {
                calculatedRoutePolylines.push([
                    [n1.lat, n1.lng],
                    [n2.lat, n2.lng],
                ]);
                routePoints.push([n1.lat, n1.lng]);
                routePoints.push([n2.lat, n2.lng]);
            }
        }
    }

    const optimalRoutePolylines = [];
    if (safeOptimalNodes.length >= 2) {
        for (let i = 0; i < safeOptimalNodes.length - 1; i++) {
            const n1 = safeOptimalNodes[i];
            const n2 = safeOptimalNodes[i + 1];
            if (n1 && n2 && n1.lat && n1.lng && n2.lat && n2.lng) {
                optimalRoutePolylines.push([
                    [n1.lat, n1.lng],
                    [n2.lat, n2.lng],
                ]);
            }
        }
    }

    const allPoints = validCities.map(c => [c.latitude, c.longitude]);
    const defaultCenter = [22.5937, 78.9629];
    const center = validCities.length > 0 ? [validCities[0].latitude, validCities[0].longitude] : defaultCenter;

    return (
        <div className="route-map-container">
            <MapContainer
                center={center}
                zoom={5}
                scrollWheelZoom={true}
                className="leaflet-map-view"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapBoundsUpdater routePoints={routePoints} allPoints={allPoints} />

                {/* Neutral background road network */}
                {allRoadPolylines.map((road) => (
                    <Polyline
                        key={`road-${road.id}`}
                        positions={road.positions}
                        pathOptions={{
                            color: "#CBD5E1",
                            weight: 1.8,
                            opacity: 0.5,
                            dashArray: "4, 4",
                        }}
                    />
                ))}

                {/* Optimal direct comparison route */}
                {optimalRoutePolylines.map((seg, idx) => (
                    <Polyline
                        key={`optimal-seg-${idx}`}
                        positions={seg}
                        pathOptions={{
                            color: "#10B981",
                            weight: 3.5,
                            opacity: 0.7,
                            dashArray: "6, 6",
                        }}
                    />
                ))}

                {/* Active calculated route */}
                {calculatedRoutePolylines.map((seg, idx) => (
                    <Polyline
                        key={`route-seg-${idx}`}
                        positions={seg}
                        pathOptions={{
                            color: "#2563EB",
                            weight: 5.5,
                            opacity: 0.95,
                        }}
                    />
                ))}

                {/* Render Markers: ONLY route nodes get special colors */}
                {validCities.map((city) => {
                    const isSource = Number(city.id) === Number(sourceCityId);
                    const isDestination = Number(city.id) === Number(destinationCityId);
                    const isStop = stopCityIds.some((sId) => Number(sId) === Number(city.id));
                    const isInPath = pathCityIds.has(Number(city.id)) || (city.name && pathCityNames.has(city.name.toLowerCase().trim()));

                    let pinType = "unselected";

                    if (isSource) {
                        pinType = "source";
                    } else if (isDestination) {
                        pinType = "destination";
                    } else if (isStop) {
                        pinType = "stop";
                    } else if (isInPath) {
                        pinType = "path-node";
                    } else if (!hasActiveRoute && (sourceCityId || destinationCityId)) {
                        pinType = "unselected";
                    }

                    return (
                        <Marker
                            key={`city-marker-${city.id}`}
                            position={[city.latitude, city.longitude]}
                            icon={createCustomIcon(city.name, pinType)}
                        >
                            <Popup>
                                <div className="map-popup">
                                    <h3>{city.name}</h3>
                                    <p className="coords-text">
                                        Lat: {Number(city.latitude).toFixed(4)}, Lng: {Number(city.longitude).toFixed(4)}
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
