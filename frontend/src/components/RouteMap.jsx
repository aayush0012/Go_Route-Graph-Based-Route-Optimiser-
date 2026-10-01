import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRealHighwayRoutes } from "../services/tomtomRouting";
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

const createNodeIcon = (cityName, role) => {
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

    return L.divIcon({
        className: "compact-node-icon-container",
        html: `
            <div class="node-marker-wrapper ${role}">
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
    routePathNames = [],
    availableRoutes = [],
    selectedRouteId = "fastest",
    onSelectCity,
    onSelectRouteOption,
    onHighwaySummary,
    onRoutesLoaded,
}) {
    const safeCities = Array.isArray(cities) ? cities : [];
    const safeRoads = Array.isArray(roads) ? roads : [];
    const safePathNodes = Array.isArray(routePathNodes) ? routePathNodes : [];
    const safePathNames = Array.isArray(routePathNames) ? routePathNames : [];

    const [internalRoutes, setInternalRoutes] = useState([]);

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
                return { ...c, latitude: Number(lat), longitude: Number(lng) };
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
                return (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) ? [Number(lat), Number(lng)] : null;
            }).filter(Boolean);

            if (coords.length >= 2) return coords;
        }

        // 2. Second priority: from routeSegments
        if (routeSegments && routeSegments.length > 0) {
            const coords = [];
            routeSegments.forEach((seg) => {
                let s = seg.source_coords || (seg.source ? getCoordinatesForCityName(seg.source) : null);
                let d = seg.dest_coords || (seg.destination ? getCoordinatesForCityName(seg.destination) : null);

                if (s && d && !isNaN(s[0]) && !isNaN(d[0])) {
                    if (coords.length === 0) coords.push([Number(s[0]), Number(s[1])]);
                    coords.push([Number(d[0]), Number(d[1])]);
                }
            });
            if (coords.length >= 2) return coords;
        }

        // 3. Third priority: from safePathNames (array of city names)
        if (safePathNames.length >= 2) {
            const coords = safePathNames.map((name) => {
                const matched = validCities.find(c => c.name && c.name.toLowerCase().trim() === name.toLowerCase().trim())
                    || validCities.find(c => c.name && (c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase())));
                if (matched) return [Number(matched.latitude), Number(matched.longitude)];
                const fallback = getCoordinatesForCityName(name);
                return fallback ? [Number(fallback[0]), Number(fallback[1])] : null;
            }).filter(Boolean);

            if (coords.length >= 2) return coords;
        }

        return [];
    }, [safePathNodes, routeSegments, safePathNames, cityMap, validCities]);

    // Fetch real highway curves from TomTom/OSRM
    useEffect(() => {
        let isMounted = true;
        if (activeRouteCoordinates.length >= 2) {
            fetchRealHighwayRoutes(activeRouteCoordinates).then((res) => {
                if (!isMounted) return;
                if (res && res.routes && res.routes.length > 0) {
                    setInternalRoutes(res.routes);
                    if (onRoutesLoaded) {
                        onRoutesLoaded(res.routes);
                    }
                    if (onHighwaySummary) {
                        onHighwaySummary(res.routes[0]);
                    }
                } else {
                    setInternalRoutes([]);
                    if (onRoutesLoaded) onRoutesLoaded([]);
                }
            }).catch(() => {
                if (isMounted) {
                    setInternalRoutes([]);
                    if (onRoutesLoaded) onRoutesLoaded([]);
                }
            });
        } else {
            setInternalRoutes([]);
            if (onRoutesLoaded) onRoutesLoaded([]);
        }
        return () => { isMounted = false; };
    }, [activeRouteCoordinates]);

    // Use availableRoutes prop if passed, otherwise fall back to internalRoutes
    const displayRoutes = (availableRoutes && availableRoutes.length > 0) ? availableRoutes : internalRoutes;

    const currentSelectedRoute = useMemo(() => {
        if (!displayRoutes || displayRoutes.length === 0) return null;
        return displayRoutes.find(r => r.id === selectedRouteId) || displayRoutes[0];
    }, [displayRoutes, selectedRouteId]);

    const activeGeometry = currentSelectedRoute?.curvedCoordinates || (activeRouteCoordinates.length >= 2 ? activeRouteCoordinates : []);

    const pathCityIds = new Set(safePathNodes.map(n => Number(n.id)));
    const pathCityNames = new Set([
        ...safePathNodes.map(n => n.name ? n.name.toLowerCase().trim() : ""),
        ...safePathNames.map(name => name ? name.toLowerCase().trim() : "")
    ]);

    // Background road network lines with computed highway travel economics
    const allRoadPolylines = useMemo(() => {
        return safeRoads.map((road) => {
            const src = cityMap[road.source_city_id];
            const dst = cityMap[road.destination_city_id];
            if (src && dst) {
                const dist = Number(road.distance) || 0;
                const totalHours = dist > 0 ? dist / 75 : 0;
                const h = Math.floor(totalHours);
                const m = Math.round((totalHours - h) * 60);
                const durStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
                const toll = dist >= 15 ? Math.round(dist * 1.8) : 0;
                const fuel = Math.round(dist / 16);
                return {
                    id: road.id,
                    distance: dist,
                    srcName: src.name,
                    dstName: dst.name,
                    durStr,
                    tollStr: toll > 0 ? `₹${toll.toLocaleString("en-IN")}` : "No Tolls",
                    fuelLiters: fuel,
                    positions: [
                        [src.latitude, src.longitude],
                        [dst.latitude, dst.longitude],
                    ],
                };
            }
            return null;
        }).filter(Boolean);
    }, [safeRoads, cityMap]);

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
                <MapBoundsUpdater routePoints={activeGeometry} allPoints={allPoints} />

                {/* Background Road Network with Click Details */}
                {allRoadPolylines.map((road) => (
                    <Polyline
                        key={`road-${road.id}`}
                        positions={road.positions}
                        pathOptions={{
                            color: "#94A3B8",
                            weight: 3,
                            opacity: 0.5,
                            dashArray: "5, 5",
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                            <span>{road.srcName} ➔ {road.dstName} ({road.distance} km) — Click for details</span>
                        </Tooltip>
                        <Popup className="path-detail-popup">
                            <div className="path-popup-card">
                                <div className="path-popup-header">
                                    <span className="path-popup-badge">Road Segment</span>
                                    <h4 className="path-popup-title">{road.srcName} ➔ {road.dstName}</h4>
                                </div>
                                <div className="path-popup-grid">
                                    <div className="path-stat-box">
                                        <span className="stat-box-label">📍 Distance</span>
                                        <span className="stat-box-val">{road.distance} km</span>
                                    </div>
                                    <div className="path-stat-box">
                                        <span className="stat-box-label">⏱️ Driving Time</span>
                                        <span className="stat-box-val">{road.durStr}</span>
                                    </div>
                                    <div className="path-stat-box">
                                        <span className="stat-box-label">💳 FASTag Toll</span>
                                        <span className="stat-box-val highlight-toll">{road.tollStr}</span>
                                    </div>
                                    <div className="path-stat-box">
                                        <span className="stat-box-label">⛽ Est. Fuel</span>
                                        <span className="stat-box-val">~{road.fuelLiters} L</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Polyline>
                ))}

                {/* Inactive Alternative Routes */}
                {displayRoutes.map((route) => {
                    const isCurrent = route.id === (currentSelectedRoute?.id || "fastest");
                    if (isCurrent || !route.curvedCoordinates || route.curvedCoordinates.length < 2) return null;

                    return (
                        <Polyline
                            key={`alt-route-${route.id}`}
                            positions={route.curvedCoordinates}
                            pathOptions={{
                                color: "#64748B",
                                weight: 4.5,
                                opacity: 0.7,
                                dashArray: "6, 8",
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                            eventHandlers={{
                                click: () => {
                                    if (onSelectRouteOption) {
                                        onSelectRouteOption(route.id);
                                    }
                                },
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                                <span>{route.label}: {route.realDistanceKm} km ({route.durationString}, {route.tollString}) — Click to inspect & select</span>
                            </Tooltip>
                            <Popup className="path-detail-popup">
                                <div className="path-popup-card">
                                    <div className="path-popup-header">
                                        <span className="path-popup-badge alt">Alternative Strategy</span>
                                        <h4 className="path-popup-title">{route.label}</h4>
                                        {route.tag && <p className="path-popup-tag">{route.tag}</p>}
                                    </div>
                                    <div className="path-popup-grid">
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">📍 Distance</span>
                                            <span className="stat-box-val">{route.realDistanceKm} km</span>
                                        </div>
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">⏱️ Driving Time</span>
                                            <span className="stat-box-val">{route.durationString}</span>
                                        </div>
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">💳 FASTag Toll</span>
                                            <span className="stat-box-val highlight-toll">{route.tollString}</span>
                                        </div>
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">⛽ Est. Fuel</span>
                                            <span className="stat-box-val">~{route.fuelNeeded} L</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-popup-select-route"
                                        onClick={() => onSelectRouteOption && onSelectRouteOption(route.id)}
                                    >
                                        Select This Route
                                    </button>
                                </div>
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Active Selected Route Polyline (Bold Royal Blue Glow + Core Line) */}
                {activeGeometry.length >= 2 && (
                    <>
                        {/* Outer Blue Glow */}
                        <Polyline
                            key={`active-route-glow-${activeGeometry.length}`}
                            positions={activeGeometry}
                            pathOptions={{
                                color: "#3B82F6",
                                weight: 9,
                                opacity: 0.35,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                        {/* Core Route Line */}
                        <Polyline
                            key={`active-route-core-${activeGeometry.length}`}
                            positions={activeGeometry}
                            pathOptions={{
                                color: "#1D4ED8",
                                weight: 5.5,
                                opacity: 1,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                                <span><strong>{currentSelectedRoute?.label || "Active Route"}</strong>: {currentSelectedRoute?.realDistanceKm || ""} km • Click for full journey breakdown</span>
                            </Tooltip>
                            <Popup className="path-detail-popup">
                                <div className="path-popup-card active-theme">
                                    <div className="path-popup-header">
                                        <span className="path-popup-badge active">Active Selected Route</span>
                                        <h4 className="path-popup-title">{currentSelectedRoute?.label || "Optimized Journey"}</h4>
                                        {currentSelectedRoute?.tag && <p className="path-popup-tag">{currentSelectedRoute.tag}</p>}
                                    </div>
                                    <div className="path-popup-grid">
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">📍 Total Distance</span>
                                            <span className="stat-box-val highlight-dist">{currentSelectedRoute?.realDistanceKm || (routeSegments.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(1))} km</span>
                                        </div>
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">⏱️ Total Driving Time</span>
                                            <span className="stat-box-val">{currentSelectedRoute?.durationString || "Live Calculation"}</span>
                                        </div>
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">💳 FASTag Toll Cost</span>
                                            <span className="stat-box-val highlight-toll">{currentSelectedRoute?.tollString || "₹0"}</span>
                                        </div>
                                        <div className="path-stat-box">
                                            <span className="stat-box-label">⛽ Total Fuel Needed</span>
                                            <span className="stat-box-val">~{currentSelectedRoute?.fuelNeeded || 0} Liters</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Polyline>
                    </>
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

                    return (
                        <Marker
                            key={`city-${city.id}`}
                            position={[city.latitude, city.longitude]}
                            icon={createNodeIcon(city.name, role)}
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
        </div>
    );
}

export default RouteMap;


