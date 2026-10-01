import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import RouteMap from "../components/RouteMap";
import api from "../services/api";
import "./RoutePlanner.css";

function RoutePlanner() {
    const [cities, setCities] = useState([]);
    const [roads, setRoads] = useState([]);
    const [sourceCity, setSourceCity] = useState("");
    const [destinationCity, setDestinationCity] = useState("");
    const [stops, setStops] = useState([]);
    const [algorithm, setAlgorithm] = useState("dijkstra");

    // Calculation states
    const [distance, setDistance] = useState(null);
    const [path, setPath] = useState([]);
    const [pathNodes, setPathNodes] = useState([]);
    const [segments, setSegments] = useState([]);
    const [optimalRoute, setOptimalRoute] = useState(null);
    const [tspSavings, setTspSavings] = useState(null);
    const [availableRoutes, setAvailableRoutes] = useState([]);
    const [selectedRouteId, setSelectedRouteId] = useState("fastest");

    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [loadingCities, setLoadingCities] = useState(true);

    // Fetch cities and roads
    useEffect(() => {
        const fetchNetworkData = async () => {
            try {
                const [citiesRes, roadsRes] = await Promise.all([
                    api.get("/cities/"),
                    api.get("/roads/"),
                ]);

                setCities(citiesRes.data);
                setRoads(roadsRes.data);

                if (citiesRes.data.length >= 2) {
                    setSourceCity(citiesRes.data[0].id.toString());
                    setDestinationCity(citiesRes.data[1].id.toString());
                }
            } catch (error) {
                console.error("Error fetching network topology:", error);
            } finally {
                setLoadingCities(false);
            }
        };

        fetchNetworkData();
    }, []);

    const resetOptimization = () => {
        if (cities.length >= 2) {
            setSourceCity(cities[0].id.toString());
            setDestinationCity(cities[1].id.toString());
        }
        setStops([]);
        setDistance(null);
        setPath([]);
        setPathNodes([]);
        setSegments([]);
        setOptimalRoute(null);
        setTspSavings(null);
        setAvailableRoutes([]);
        setSelectedRouteId("fastest");
        setErrorMsg("");
    };

    const swapCities = () => {
        const temp = sourceCity;
        setSourceCity(destinationCity);
        setDestinationCity(temp);
    };

    const addStop = () => {
        if (cities.length === 0) return;
        const availableCity = cities.find(
            (c) => c.id.toString() !== sourceCity && c.id.toString() !== destinationCity && !stops.includes(c.id.toString())
        ) || cities[0];
        setStops([...stops, availableCity.id.toString()]);
    };

    const removeStop = (indexToRemove) => {
        setStops(stops.filter((_, idx) => idx !== indexToRemove));
        setTspSavings(null);
    };

    const moveStopUp = (index) => {
        if (index <= 0) return;
        const updated = [...stops];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        setStops(updated);
        setTspSavings(null);
    };

    const moveStopDown = (index) => {
        if (index >= stops.length - 1) return;
        const updated = [...stops];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        setStops(updated);
        setTspSavings(null);
    };

    const handleStopChange = (index, value) => {
        const updated = [...stops];
        updated[index] = value;
        setStops(updated);
        setTspSavings(null);
    };

    const handleSelectCityFromMap = (cityId, role) => {
        if (role === "source") {
            setSourceCity(cityId.toString());
        } else if (role === "destination") {
            setDestinationCity(cityId.toString());
        }
    };

    const findRoute = async (optimize = false) => {
        if (!sourceCity || !destinationCity) {
            setErrorMsg("Please select both Origin and Destination.");
            return;
        }

        if (sourceCity === destinationCity && stops.length === 0) {
            setErrorMsg("Origin and Destination cannot be the same hub.");
            return;
        }

        setIsSearching(true);
        setErrorMsg("");

        try {
            const parsedStops = stops.map((s) => Number(s));
            const payload = {
                source_city_id: Number(sourceCity),
                destination_city_id: Number(destinationCity),
                stops: parsedStops.length > 0 ? parsedStops : undefined,
                algorithm: algorithm,
                optimize_stops: Boolean(optimize),
            };

            const response = await api.post("/route/", payload);

            const rawDist = response.data.distance;
            const rawPath = response.data.path || [];
            let resolvedNodes = response.data.path_nodes || [];
            let resolvedSegments = response.data.segments || [];

            // Robust fallback if backend only returned path strings
            if (rawPath.length >= 2) {
                if (resolvedNodes.length === 0) {
                    resolvedNodes = rawPath.map((name) => {
                        const c = cities.find(city => city.name === name || (city.name && city.name.toLowerCase() === name.toLowerCase()));
                        return {
                            id: c ? c.id : null,
                            name: name,
                            lat: c ? c.latitude : null,
                            lng: c ? c.longitude : null,
                        };
                    });
                }

                if (resolvedSegments.length === 0) {
                    const avgDist = rawDist ? Math.round(rawDist / (rawPath.length - 1)) : 0;
                    resolvedSegments = [];
                    for (let i = 0; i < rawPath.length - 1; i++) {
                        const sName = rawPath[i];
                        const dName = rawPath[i + 1];
                        const sCity = cities.find(c => c.name === sName);
                        const dCity = cities.find(c => c.name === dName);
                        resolvedSegments.push({
                            source: sName,
                            destination: dName,
                            distance: avgDist,
                            source_coords: sCity ? [sCity.latitude, sCity.longitude] : null,
                            dest_coords: dCity ? [dCity.latitude, dCity.longitude] : null,
                        });
                    }
                }
            }

            setDistance(rawDist);
            setPath(rawPath);
            setPathNodes(resolvedNodes);
            setSegments(resolvedSegments);
            setOptimalRoute(response.data.optimal_route || null);

            if (response.data.tsp_savings) {
                setTspSavings(response.data.tsp_savings);
                if (optimize && response.data.tsp_savings.optimized_stops) {
                    setStops(response.data.tsp_savings.optimized_stops.map(String));
                }
            } else {
                setTspSavings(null);
            }
        } catch (error) {
            setDistance(null);
            setPath([]);
            setPathNodes([]);
            setSegments([]);
            setOptimalRoute(null);
            setTspSavings(null);
            setErrorMsg(error.response?.data?.detail || "No connected path found between selected hubs.");
        } finally {
            setIsSearching(false);
        }
    };

    const applyTspOrdering = () => {
        if (tspSavings && tspSavings.optimized_stops) {
            setStops(tspSavings.optimized_stops.map(String));
            findRoute(true);
        }
    };

    // Active Route Selection (Fastest vs Cheapest)
    const currentRoute = availableRoutes.find(r => r.id === selectedRouteId) || (availableRoutes.length > 0 ? availableRoutes[0] : null);

    // Derived metrics: Realistic passenger car / SUV journey economics
    const averageSpeed = 75; // km/h average highway speed
    const baseDistance = distance || 0;
    const totalHours = baseDistance ? baseDistance / averageSpeed : 0;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const defaultDurationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const carMileage = 16; // 16 km per liter
    const tollRatePerKm = 1.8; // ₹1.80 per km (NHAI standard 4-lane passenger car FASTag average)

    const defaultFuel = baseDistance ? Math.round(baseDistance / carMileage) : 0;
    const defaultTollCost = baseDistance >= 15 ? Math.round(baseDistance * tollRatePerKm) : 0;
    const defaultTollString = defaultTollCost > 0 ? `₹${defaultTollCost.toLocaleString("en-IN")}` : "No Tolls";

    // Effective display metrics based on active selected route
    const displayDistance = currentRoute ? currentRoute.realDistanceKm : baseDistance;
    const displayDuration = currentRoute ? currentRoute.durationString : defaultDurationString;
    const displayFuel = currentRoute ? currentRoute.fuelNeeded : defaultFuel;
    const displayToll = currentRoute ? currentRoute.tollString : defaultTollString;


    return (
        <Layout>
            <div className="goroute-layout-container">
                {/* 1. Left Panel: Route Configuration & Itinerary Breakdown */}
                <section className="config-itinerary-panel">
                    <div className="config-card">
                        <div className="config-header-row">
                            <h2 className="panel-title">Route Configuration</h2>
                            <button
                                type="button"
                                className="btn-reset-light"
                                onClick={resetOptimization}
                                title="Reset inputs and clear route"
                            >
                                Reset
                            </button>
                        </div>

                        {/* Origin Field */}
                        <div className="form-field">
                            <label htmlFor="source" className="field-label">
                                <span className="status-dot green-dot"></span>
                                Origin (Start Hub)
                            </label>
                            <select
                                id="source"
                                className="styled-select"
                                value={sourceCity}
                                onChange={(e) => setSourceCity(e.target.value)}
                                disabled={loadingCities}
                            >
                                {cities.map((city) => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Swap Button */}
                        <div className="swap-button-row">
                            <button
                                type="button"
                                className="btn-swap-pill"
                                onClick={swapCities}
                                disabled={loadingCities}
                                title="Swap Origin & Destination"
                            >
                                ⇄ Swap Hubs
                            </button>
                        </div>

                        {/* Destination Field */}
                        <div className="form-field">
                            <label htmlFor="destination" className="field-label">
                                <span className="status-dot red-dot"></span>
                                Destination (End Hub)
                            </label>
                            <select
                                id="destination"
                                className="styled-select"
                                value={destinationCity}
                                onChange={(e) => setDestinationCity(e.target.value)}
                                disabled={loadingCities}
                            >
                                {cities.map((city) => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Waypoints List */}
                        {stops.length > 0 && (
                            <div className="waypoints-subpanel">
                                <div className="waypoints-header-row">
                                    <span className="waypoints-subhead">Intermediate Stops ({stops.length}):</span>
                                    <span className="waypoints-subhead-hint">Reorder with ▲/▼</span>
                                </div>
                                {stops.map((stopId, index) => (
                                    <div key={index} className="waypoint-item-row">
                                        <span className="stop-pill-tag">Stop {index + 1}</span>
                                        <select
                                            className="styled-select mini"
                                            value={stopId}
                                            onChange={(e) => handleStopChange(index, e.target.value)}
                                            disabled={loadingCities}
                                        >
                                            {cities.map((city) => (
                                                <option key={city.id} value={city.id}>
                                                    {city.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="waypoint-row-actions">
                                            <button
                                                type="button"
                                                className="btn-reorder-arrow"
                                                onClick={() => moveStopUp(index)}
                                                disabled={index === 0}
                                                title="Move stop up"
                                            >
                                                ▲
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-reorder-arrow"
                                                onClick={() => moveStopDown(index)}
                                                disabled={index === stops.length - 1}
                                                title="Move stop down"
                                            >
                                                ▼
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-remove-waypoint"
                                                onClick={() => removeStop(index)}
                                                title="Remove stop"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {stops.length >= 2 && (
                                    <button
                                        type="button"
                                        className="btn-auto-reorder-stops"
                                        onClick={() => findRoute(true)}
                                        disabled={loadingCities || isSearching}
                                        title="Automatically reorder stops to find the shortest total driving route"
                                    >
                                        ⚡ Auto-Reorder Stops (Shortest Path)
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            className="btn-add-stop-flat"
                            onClick={addStop}
                            disabled={loadingCities}
                        >
                            + Add Waypoint Stop
                        </button>

                        <button
                            type="button"
                            className="btn-calculate-dark"
                            onClick={() => findRoute(false)}
                            disabled={loadingCities || isSearching}
                        >
                            {isSearching ? "Calculating Route..." : "Calculate Route"}
                        </button>

                        {errorMsg && <div className="panel-error-alert">{errorMsg}</div>}
                    </div>

                    {/* Route & Trip Details Section with Clear Plain Language */}
                    <div className="itinerary-card">
                        <h3 className="panel-title">Route & Trip Details</h3>

                        {/* Stop Sequence Optimization Suggestion Banner (Progressive Disclosure) */}
                        {tspSavings && !tspSavings.is_optimized && tspSavings.can_save && (
                            <div className="reorder-stops-banner">
                                <div className="reorder-banner-header">
                                    <span className="reorder-icon">💡</span>
                                    <div className="reorder-text-content">
                                        <strong className="reorder-title">Optimize Route for Distance & Cost</strong>
                                        <span className="reorder-desc">
                                            Reordering intermediate stops saves <strong>{tspSavings.saved_distance_km} km</strong> and <strong>~₹{tspSavings.saved_toll_inr} toll</strong> while keeping Origin and Destination fixed.
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-apply-reorder"
                                    onClick={applyTspOrdering}
                                >
                                    ⚡ Reorder Stops for Best Route ({tspSavings.optimized_stop_names?.join(" ➔ ")})
                                </button>
                            </div>
                        )}

                        {tspSavings && tspSavings.is_optimized && (
                            <div className="reorder-applied-badge">
                                <span className="reorder-check">✓</span>
                                <span>Optimal Stop Sequence Applied (Saved {tspSavings.saved_distance_km} km & ₹{tspSavings.saved_toll_inr} toll)</span>
                            </div>
                        )}

                        {/* Driving Route Strategy (Dual Fastest/Cheapest or Unified) */}
                        {availableRoutes && availableRoutes.length >= 1 && (
                            <div className="route-strategy-section">
                                <span className="route-strategy-label">
                                    {availableRoutes.length > 1 ? "Select Driving Route Strategy:" : "Driving Route Strategy:"}
                                </span>
                                <div className="route-strategy-grid">
                                    {availableRoutes.map((r) => {
                                        const isSelected = (currentRoute?.id === r.id);
                                        return (
                                            <button
                                                key={r.id}
                                                type="button"
                                                className={`route-strategy-card ${isSelected ? "selected" : ""}`}
                                                onClick={() => setSelectedRouteId(r.id)}
                                            >
                                                <div className="strategy-top-row">
                                                    <span className="strategy-title">{r.label}</span>
                                                    {r.tag && <span className="strategy-tag">{r.tag}</span>}
                                                </div>
                                                <div className="strategy-stats-row">
                                                    <span className="strategy-stat">⏱️ {r.durationString}</span>
                                                    <span className="strategy-stat">📍 {r.realDistanceKm} km</span>
                                                    <span className="strategy-stat">💳 {r.tollString}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {path && path.length >= 2 && (
                            <div className="trip-overview-banner">
                                <span className="trip-overview-label">Full Route Journey:</span>
                                <div className="trip-path-chips">
                                    {path.map((cityName, idx) => {
                                        const isFirst = idx === 0;
                                        const isLast = idx === path.length - 1;
                                        const tagClass = isFirst ? "origin" : isLast ? "destination" : "transit";
                                        const roleText = isFirst ? "Origin" : isLast ? "Destination" : `Stop ${idx}`;

                                        return (
                                            <div key={idx} className="trip-node-step">
                                                <div className={`path-chip ${tagClass}`}>
                                                    <span className="chip-role">{roleText}:</span>
                                                    <span className="chip-name">{cityName}</span>
                                                </div>
                                                {!isLast && <div className="path-step-connector">↓</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(displayDistance > 0 || distance !== null) && (
                            <div className="itinerary-metrics-grid">
                                <div className="metric-pill highlight">
                                    <span className="metric-lbl">Total Distance</span>
                                    <span className="metric-val">{displayDistance} km</span>
                                </div>
                                <div className="metric-pill">
                                    <span className="metric-lbl">Driving Time</span>
                                    <span className="metric-val">{displayDuration}</span>
                                </div>
                                <div className="metric-pill">
                                    <span className="metric-lbl">Fuel Needed</span>
                                    <span className="metric-val">~{displayFuel} Liters</span>
                                </div>
                                <div className="metric-pill">
                                    <span className="metric-lbl">Toll Cost</span>
                                    <span className="metric-val">{displayToll}</span>
                                </div>
                            </div>
                        )}

                        {segments && segments.length > 0 ? (
                            <div className="itinerary-cards-list">
                                <span className="steps-header-lbl">Step-by-Step Driving Directions:</span>
                                {segments.map((seg, idx) => {
                                    const isFirst = idx === 0;
                                    const isLast = idx === segments.length - 1;
                                    let stepDescription = `Drive from ${seg.source} to ${seg.destination}`;
                                    if (isFirst && segments.length === 1) {
                                        stepDescription = `Drive directly from ${seg.source} to ${seg.destination}`;
                                    } else if (isFirst) {
                                        stepDescription = `Start at ${seg.source} and drive to ${seg.destination}`;
                                    } else if (isLast) {
                                        stepDescription = `Depart from ${seg.source} and reach final destination ${seg.destination}`;
                                    }

                                    const segDist = Number(seg.distance) || 0;
                                    const segHours = segDist > 0 ? segDist / 75 : 0;
                                    const sh = Math.floor(segHours);
                                    const sm = Math.round((segHours - sh) * 60);
                                    const segDuration = sh > 0 ? `${sh}h ${sm}m` : `${sm}m`;
                                    const segToll = segDist >= 15 ? Math.round(segDist * 1.8) : 0;
                                    const segFuel = Math.round(segDist / 16);

                                    return (
                                        <div key={idx} className="itinerary-step-card">
                                            <div className="step-circle-badge">{idx + 1}</div>
                                            <div className="step-content">
                                                <div className="step-route-row">
                                                    <span className="step-route-name">{seg.source} ➔ {seg.destination}</span>
                                                    <span className="step-dist-val">{seg.distance} km</span>
                                                </div>
                                                <span className="step-subtext">{stepDescription}</span>
                                                <div className="step-metrics-mini-row">
                                                    <span className="step-mini-tag">⏱️ {segDuration}</span>
                                                    <span className="step-mini-tag toll">💳 {segToll > 0 ? `₹${segToll}` : "No Toll"}</span>
                                                    <span className="step-mini-tag">⛽ ~{segFuel} L</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-itinerary-placeholder">
                                <p>Select your Start and Destination cities above, then click <strong>"Calculate Route"</strong> to see your step-by-step directions.</p>
                            </div>
                        )}
                    </div>

                </section>

                {/* 3. Right Side: Clean Map Filling 100% of Space without Any Top Banner */}
                <main className="map-stage-panel">
                    <div className="map-view-wrapper">
                        <RouteMap
                            cities={cities}
                            roads={roads}
                            sourceCityId={sourceCity}
                            destinationCityId={destinationCity}
                            stopCityIds={stops}
                            routeSegments={segments}
                            routePathNodes={pathNodes}
                            routePathNames={path}
                            availableRoutes={availableRoutes}
                            selectedRouteId={selectedRouteId}
                            onSelectCity={handleSelectCityFromMap}
                            onSelectRouteOption={(routeId) => setSelectedRouteId(routeId)}
                            onRoutesLoaded={(routes) => {
                                setAvailableRoutes(routes);
                                if (routes.length > 0 && !routes.find(r => r.id === selectedRouteId)) {
                                    setSelectedRouteId(routes[0].id);
                                }
                            }}
                            onHighwaySummary={(summary) => {
                                if (summary && summary.realDistanceKm) {
                                    setDistance(summary.realDistanceKm);
                                }
                            }}
                        />

                    </div>
                </main>
            </div>
        </Layout>
    );
}

export default RoutePlanner;