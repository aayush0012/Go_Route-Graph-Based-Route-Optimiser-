import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./RouteMap.css";

// Helper component to auto-focus and zoom bounds on the active route or all points
function MapBoundsUpdater({ routePoints, allPoints }) {
    const map = useMap();
    const routePointsKey = JSON.stringify(routePoints);
    const allPointsKey = JSON.stringify(allPoints);

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                map.invalidateSize();
                const targetPoints = (routePoints && routePoints.length >= 2) ? routePoints : allPoints;
                if (targetPoints && targetPoints.length > 0) {
                    const validPoints = targetPoints.filter(p => Array.isArray(p) && p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]));
                    if (validPoints.length > 0) {
                        const bounds = L.latLngBounds(validPoints);
                        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, animate: true });
                    }
                }
            } catch (err) {
                console.error("MapBoundsUpdater error:", err);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [routePointsKey, allPointsKey, map]);

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

export const getCoordinatesForCityName = (rawName) => {
    if (!rawName) return null;
    const lower = rawName.toLowerCase().trim();
    if (KNOWN_CITY_COORDS[lower]) return KNOWN_CITY_COORDS[lower];

    // Strip parentheses e.g. "Delhi NCR (North Mega-Hub)" -> "delhi ncr"
    const noParens = lower.replace(/\s*\([^)]*\)/g, "").trim();
    if (KNOWN_CITY_COORDS[noParens]) return KNOWN_CITY_COORDS[noParens];

    // Match substrings
    for (const [cityName, coords] of Object.entries(KNOWN_CITY_COORDS)) {
        if (lower.includes(cityName) || noParens.includes(cityName)) {
            return coords;
        }
    }
    return null;
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

    // Map cities with valid coordinates
    const validCities = useMemo(() => {
        return safeCities.map((c) => {
            if (!c) return null;
            let lat = c.latitude;
            let lng = c.longitude;

            if ((lat === null || lng === null || isNaN(lat) || isNaN(lng)) && c.name) {
                const coords = getCoordinatesForCityName(c.name);
                if (coords) {
                    [lat, lng] = coords;
                }
            }

            if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                return { ...c, latitude: lat, longitude: lng };
            }
            return null;
        }).filter(Boolean);
    }, [safeCities]);

    const cityMap = useMemo(() => {
        const map = {};
        validCities.forEach(c => {
            map[c.id] = c;
        });
        return map;
    }, [validCities]);

    // Construct the continuous sequence of coordinates for the active route
    const activeRouteCoordinates = useMemo(() => {
        // 1. First priority: from routePathNodes
        if (safePathNodes.length >= 2) {
            const coords = safePathNodes.map((n) => {
                let lat = n.lat;
                let lng = n.lng;

                if ((lat == null || isNaN(lat)) && n.id && cityMap[n.id]) {
                    lat = cityMap[n.id].latitude;
                    lng = cityMap[n.id].longitude;
                }
                if ((lat == null || isNaN(lat)) && n.name) {
                    const fallback = getCoordinatesForCityName(n.name);
                    if (fallback) {
                        [lat, lng] = fallback;
                    }
                }
                return (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null;
            }).filter(Boolean);

            if (coords.length >= 2) return coords;
        }

        // 2. Second priority: from routeSegments
        if (routeSegments && routeSegments.length > 0) {
            const coords = [];
            routeSegments.forEach((seg) => {
                let s = seg.source_coords;
                let d = seg.dest_coords;

                if (!s && seg.source) {
                    s = getCoordinatesForCityName(seg.source);
                }
                if (!d && seg.destination) {
                    d = getCoordinatesForCityName(seg.destination);
                }

                if (s && d && !isNaN(s[0]) && !isNaN(d[0])) {
                    if (coords.length === 0) coords.push(s);
                    coords.push(d);
                }
            });
            if (coords.length >= 2) return coords;
        }

        return [];
    }, [safePathNodes, routeSegments, cityMap]);

    const hasActiveRoute = activeRouteCoordinates.length >= 2;
    const pathCityIds = new Set(safePathNodes.map(n => Number(n.id)));
    const pathCityNames = new Set(safePathNodes.map(n => n.name ? n.name.toLowerCase().trim() : ""));

    // Background road network lines
    const allRoadPolylines = useMemo(() => {
        return safeRoads.map((road) => {
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
    }, [safeRoads, cityMap]);

    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationIndex, setAnimationIndex] = useState(0);
    const [animSpeed, setAnimSpeed] = useState(1000);
    const [freightPosition, setFreightPosition] = useState(null);
    const animTimerRef = useRef(null);

    useEffect(() => {
        setIsAnimating(false);
        setFreightPosition(null);
        setAnimationIndex(activeRouteCoordinates.length);
    }, [activeRouteCoordinates]);

    useEffect(() => {
        if (!isAnimating || activeRouteCoordinates.length < 2) {
            clearInterval(animTimerRef.current);
            return;
        }

        animTimerRef.current = setInterval(() => {
            setAnimationIndex((prev) => {
                const next = prev + 1;
                if (next >= activeRouteCoordinates.length) {
                    setIsAnimating(false);
                    return activeRouteCoordinates.length;
                }
                setFreightPosition(activeRouteCoordinates[next]);
                return next;
            });
        }, animSpeed);

        return () => clearInterval(animTimerRef.current);
    }, [isAnimating, activeRouteCoordinates, animSpeed]);

    const startAnimation = () => {
        if (activeRouteCoordinates.length >= 2) {
            setAnimationIndex(1);
            setFreightPosition(activeRouteCoordinates[0]);
            setIsAnimating(true);
        }
    };

    const togglePlay = () => {
        if (animationIndex >= activeRouteCoordinates.length) {
            startAnimation();
        } else {
            setIsAnimating(!isAnimating);
        }
    };

    const resetAnimation = () => {
        setIsAnimating(false);
        setAnimationIndex(activeRouteCoordinates.length);
        setFreightPosition(null);
    };

    // Visible coordinates for polyline
    const visibleCoords = isAnimating
        ? activeRouteCoordinates.slice(0, Math.max(2, animationIndex + 1))
        : activeRouteCoordinates;

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

                {/* Auto Zoom & Bounds Updater */}
                <MapBoundsUpdater routePoints={activeRouteCoordinates} allPoints={allPoints} />

                {/* Background Road Network */}
                {allRoadPolylines.map((road) => (
                    <Polyline
                        key={`road-${road.id}`}
                        positions={road.positions}
                        pathOptions={{
                            color: "#94A3B8",
                            weight: 2,
                            opacity: 0.45,
                            dashArray: "5, 5",
                        }}
                    />
                ))}

                {/* Active Route Polylines */}
                {visibleCoords.length >= 2 && (
                    <>
                        {/* Outer Glow */}
                        <Polyline
                            key="active-route-glow"
                            positions={visibleCoords}
                            pathOptions={{
                                color: "#10B981",
                                weight: 10,
                                opacity: 0.35,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                        {/* Core Emerald Line */}
                        <Polyline
                            key="active-route-core"
                            positions={visibleCoords}
                            pathOptions={{
                                color: "#059669",
                                weight: 5,
                                opacity: 1,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    </>
                )}

                {/* Freight Icon during animation */}
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

            {/* Animation Controls */}
            {hasActiveRoute && (
                <div className="traversal-animator-dock">
                    <button
                        type="button"
                        className="anim-play-btn"
                        onClick={togglePlay}
                        title={isAnimating ? "Pause Simulation" : "Play Route Simulation"}
                    >
                        {isAnimating ? "⏸ Pause" : "▶ Simulate Route"}
                    </button>

                    <div className="anim-progress-text">
                        <span>Hop {animationIndex}/{activeRouteCoordinates.length - 1}</span>
                    </div>

                    <button
                        type="button"
                        className={`anim-speed-btn ${animSpeed === 1000 ? "active" : ""}`}
                        onClick={() => setAnimSpeed(1000)}
                    >
                        1x
                    </button>
                    <button
                        type="button"
                        className={`anim-speed-btn ${animSpeed === 500 ? "active" : ""}`}
                        onClick={() => setAnimSpeed(500)}
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
