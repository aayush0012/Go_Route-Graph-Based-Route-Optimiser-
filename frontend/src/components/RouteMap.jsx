import React, { useState, useEffect, useRef } from "react";
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
    "nagpur": [21.1458, 79.0882],
    "patna": [25.5941, 85.1376],
    "visakhapatnam": [17.6868, 83.2185],
    "vadodara": [22.3072, 73.1812],
    "guwahati": [26.1445, 91.7362],
    "coimbatore": [11.0168, 76.9558],
};

const createNodeIcon = (cityName, role, isAnimatedCurrent = false) => {
    const isMuted = role === "unselected";

    if (isMuted) {
        return L.divIcon({
            className: "unselected-node-container",
            html: `
                <div class="node-marker-wrapper unselected" title="${cityName}">
                    <div class="unselected-dot"></div>
                </div>
            `,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            popupAnchor: [0, -6],
        });
    }

    let specialBadge = "";
    if (role === "source") {
        specialBadge = `<span class="badge-tag source-tag">Origin</span>`;
    } else if (role === "destination") {
        specialBadge = `<span class="badge-tag dest-tag">Dest</span>`;
    } else if (role === "stop") {
        specialBadge = `<span class="badge-tag stop-tag">Stop</span>`;
    } else if (role === "path-node") {
        specialBadge = `<span class="badge-tag path-tag">Transit</span>`;
    }

    const shortLabel = cityName.replace(/\s*\([^)]*\)/g, "").trim();
    const animClass = isAnimatedCurrent ? "current-frontier-node" : "";

    return L.divIcon({
        className: "compact-node-icon-container",
        html: `
            <div class="node-marker-wrapper ${role} ${animClass}">
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

// Moving Transit Freight Marker
const createFreightMarkerIcon = () => {
    return L.divIcon({
        className: "freight-transit-icon-container",
        html: `
            <div class="freight-pulse-beacon">
                <div class="freight-pulse-ring"></div>
                <div class="freight-pulse-core">🚚</div>
            </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
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

    // Algorithm Traversal Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationStep, setAnimationStep] = useState(0);
    const [animSpeed, setAnimSpeed] = useState(1200); // ms per step
    const [freightPosition, setFreightPosition] = useState(null);
    const animTimerRef = useRef(null);

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

    // Build segments list
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

    // Animation loop
    const totalSteps = calculatedRoutePolylines.length;

    useEffect(() => {
        if (!isAnimating || totalSteps === 0) {
            clearInterval(animTimerRef.current);
            return;
        }

        animTimerRef.current = setInterval(() => {
            setAnimationStep((prev) => {
                const nextStep = prev + 1;
                if (nextStep > totalSteps) {
                    setIsAnimating(false);
                    return totalSteps;
                }
                // Set freight marker position to current node
                const activePoly = calculatedRoutePolylines[nextStep - 1];
                if (activePoly && activePoly[1]) {
                    setFreightPosition(activePoly[1]);
                }
                return nextStep;
            });
        }, animSpeed);

        return () => clearInterval(animTimerRef.current);
    }, [isAnimating, totalSteps, animSpeed, calculatedRoutePolylines]);

    // Reset animation when new route loads
    useEffect(() => {
        if (hasActiveRoute) {
            setAnimationStep(totalSteps);
            setIsAnimating(false);
            setFreightPosition(null);
        }
    }, [hasActiveRoute, totalSteps]);

    const startAnimation = () => {
        setAnimationStep(1);
        setIsAnimating(true);
        if (calculatedRoutePolylines[0]) {
            setFreightPosition(calculatedRoutePolylines[0][0]);
        }
    };

    const togglePlay = () => {
        if (animationStep >= totalSteps) {
            startAnimation();
        } else {
            setIsAnimating(!isAnimating);
        }
    };

    const resetAnimation = () => {
        setIsAnimating(false);
        setAnimationStep(totalSteps);
        setFreightPosition(null);
    };

    // Filter polylines to show based on animation step
    const visibleRoutePolylines = isAnimating || animationStep < totalSteps
        ? calculatedRoutePolylines.slice(0, animationStep)
        : calculatedRoutePolylines;

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

                {/* Active calculated route polylines with animated pulse glow */}
                {visibleRoutePolylines.map((seg, idx) => (
                    <Polyline
                        key={`calc-seg-${idx}`}
                        positions={seg}
                        pathOptions={{
                            color: "#059669",
                            weight: 5,
                            opacity: 0.9,
                        }}
                    />
                ))}

                {/* Moving Freight Vehicle Icon during animation */}
                {freightPosition && (
                    <Marker
                        position={freightPosition}
                        icon={createFreightMarkerIcon()}
                        zIndexOffset={1000}
                    />
                )}

                {/* City Nodes */}
                {validCities.map((city) => {
                    const idNum = Number(city.id);
                    const nameKey = city.name ? city.name.toLowerCase().trim() : "";

                    const isSource = sourceCityId && idNum === Number(sourceCityId);
                    const isDest = destinationCityId && idNum === Number(destinationCityId);
                    const isStop = stopCityIds && stopCityIds.map(Number).includes(idNum);
                    const isPathNode = pathCityIds.has(idNum) || pathCityNames.has(nameKey);

                    let role = "unselected";
                    if (isSource) role = "source";
                    else if (isDest) role = "destination";
                    else if (isStop) role = "stop";
                    else if (isPathNode) role = "path-node";

                    const isCurrentFrontier = isAnimating && freightPosition && freightPosition[0] === city.latitude && freightPosition[1] === city.longitude;

                    return (
                        <Marker
                            key={`city-${city.id}`}
                            position={[city.latitude, city.longitude]}
                            icon={createNodeIcon(city.name, role, isCurrentFrontier)}
                        >
                            <Popup className="map-popup">
                                <h3>{city.name}</h3>
                                <p className="coords-text">
                                    {city.latitude.toFixed(4)}° N, {city.longitude.toFixed(4)}° E
                                </p>
                                <div className="popup-actions">
                                    <button
                                        type="button"
                                        className="btn-select-start"
                                        onClick={() => onSelectCity && onSelectCity(city.id, "source")}
                                    >
                                        Set Origin
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-select-end"
                                        onClick={() => onSelectCity && onSelectCity(city.id, "destination")}
                                    >
                                        Set Dest
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Algorithm Traversal Animation Floating Controller */}
            {hasActiveRoute && (
                <div className="traversal-animator-dock">
                    <button
                        type="button"
                        className="anim-play-btn"
                        onClick={togglePlay}
                        title={isAnimating ? "Pause Traversal" : "Play Traversal"}
                    >
                        {isAnimating ? "⏸ Pause" : "▶ Simulate Route Traversal"}
                    </button>

                    <div className="anim-progress-text">
                        <span>Leg {animationStep}/{totalSteps}</span>
                    </div>

                    <button
                        type="button"
                        className={`anim-speed-btn ${animSpeed === 1200 ? "active" : ""}`}
                        onClick={() => setAnimSpeed(1200)}
                    >
                        1x
                    </button>
                    <button
                        type="button"
                        className={`anim-speed-btn ${animSpeed === 600 ? "active" : ""}`}
                        onClick={() => setAnimSpeed(600)}
                    >
                        2x
                    </button>

                    <button
                        type="button"
                        className="anim-reset-btn"
                        onClick={resetAnimation}
                        title="Show Full Route"
                    >
                        ⏮ Reset
                    </button>
                </div>
            )}
        </div>
    );
}

export default RouteMap;
