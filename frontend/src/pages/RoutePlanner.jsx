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
    };

    const handleStopChange = (index, value) => {
        const updated = [...stops];
        updated[index] = value;
        setStops(updated);
    };

    const handleSelectCityFromMap = (cityId, role) => {
        if (role === "source") {
            setSourceCity(cityId.toString());
        } else if (role === "destination") {
            setDestinationCity(cityId.toString());
        }
    };

    const findRoute = async () => {
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
        } catch (error) {
            setDistance(null);
            setPath([]);
            setPathNodes([]);
            setSegments([]);
            setOptimalRoute(null);
            setErrorMsg(error.response?.data?.detail || "No connected path found between selected hubs.");
        } finally {
            setIsSearching(false);
        }
    };

    // Derived metrics
    const averageSpeed = 65; // km/h
    const totalHours = distance ? distance / averageSpeed : 0;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    const estimatedFuel = distance ? Math.round(distance / 4) : 0;
    const estimatedCost = distance ? (distance * 35).toLocaleString("en-IN") : "0";

    return (
        <Layout>
            <div className="goroute-layout-container">
                {/* 1. Left Sub-Sidebar: Core Operations */}
                <aside className="ops-sidebar">
                    <div className="ops-header">
                        <h2 className="ops-title">Core Operations</h2>
                        <span className="ops-subtitle">GoRoute Precision Engine</span>
                    </div>

                    <button
                        type="button"
                        className="btn-new-optimization"
                        onClick={resetOptimization}
                    >
                        + New Optimization
                    </button>

                    <nav className="ops-nav-menu">
                        <Link to="/route" className="ops-nav-item active">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="19" r="2"/><path d="M12 17V12"/><path d="M12 12C12 9 8 8 6 6"/><path d="M12 12C12 9 16 8 18 6"/><polyline points="4 8 6 6 8 8"/><polyline points="16 8 18 6 20 8"/></svg>
                            Route Planner
                        </Link>
                        <Link to="/cities" className="ops-nav-item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="8" height="17" rx="0.5"/><rect x="13" y="9" width="8" height="12" rx="0.5"/><line x1="5.5" y1="8" x2="6.5" y2="8"/><line x1="8.5" y1="8" x2="9.5" y2="8"/></svg>
                            Hub Management
                        </Link>
                        <Link to="/roads" className="ops-nav-item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="3" x2="6" y2="21" strokeDasharray="3 3"/><line x1="18" y1="3" x2="18" y2="21"/><line x1="3" y1="9" x2="9" y2="9"/><line x1="15" y1="15" x2="21" y2="15"/></svg>
                            Road Pathways
                        </Link>
                        <Link to="/dashboard" className="ops-nav-item">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            Dashboard Overview
                        </Link>
                    </nav>
                </aside>

                {/* 2. Middle Panel: Route Configuration & Itinerary Breakdown */}
                <section className="config-itinerary-panel">
                    <div className="config-card">
                        <h2 className="panel-title">Route Configuration</h2>

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

                        {/* Algorithm Selector */}
                        <div className="form-field">
                            <label htmlFor="algorithm" className="field-label">Routing Algorithm</label>
                            <select
                                id="algorithm"
                                className="styled-select"
                                value={algorithm}
                                onChange={(e) => setAlgorithm(e.target.value)}
                                disabled={loadingCities}
                            >
                                <option value="dijkstra">Dijkstra (Shortest Distance)</option>
                                <option value="a_star">A* Search (Spatial Heuristic)</option>
                            </select>
                        </div>

                        {/* Waypoints List */}
                        {stops.length > 0 && (
                            <div className="waypoints-subpanel">
                                <span className="waypoints-subhead">Intermediate Stops:</span>
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
                                        <button
                                            type="button"
                                            className="btn-remove-waypoint"
                                            onClick={() => removeStop(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
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
                            onClick={findRoute}
                            disabled={loadingCities || isSearching}
                        >
                            {isSearching ? "Calculating Path..." : "Calculate Shortest Route"}
                        </button>

                        {errorMsg && <div className="panel-error-alert">{errorMsg}</div>}
                    </div>

                    {/* Itinerary Breakdown Section with Integrated Metrics */}
                    <div className="itinerary-card">
                        <h3 className="panel-title">Itinerary Breakdown</h3>

                        {distance !== null && (
                            <div className="itinerary-metrics-grid">
                                <div className="metric-pill highlight">
                                    <span className="metric-lbl">Total Distance</span>
                                    <span className="metric-val">{distance} km</span>
                                </div>
                                <div className="metric-pill">
                                    <span className="metric-lbl">Est. Time</span>
                                    <span className="metric-val">{durationString}</span>
                                </div>
                                <div className="metric-pill">
                                    <span className="metric-lbl">Est. Fuel</span>
                                    <span className="metric-val">~{estimatedFuel} L</span>
                                </div>
                                <div className="metric-pill">
                                    <span className="metric-lbl">Freight Cost</span>
                                    <span className="metric-val">₹{estimatedCost}</span>
                                </div>
                            </div>
                        )}

                        {segments && segments.length > 0 ? (
                            <div className="itinerary-cards-list">
                                {segments.map((seg, idx) => (
                                    <div key={idx} className="itinerary-step-card">
                                        <div className="step-circle-badge">{idx + 1}</div>
                                        <div className="step-content">
                                            <div className="step-route-row">
                                                <span className="step-route-name">{seg.source} ➔ {seg.destination}</span>
                                                <span className="step-dist-val">{seg.distance} km</span>
                                            </div>
                                            <span className="step-subtext">Leg {idx + 1} Freight Transit</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-itinerary-placeholder">
                                <p>Select hubs and click calculate to view step-by-step corridor metrics.</p>
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
                            optimalPathNodes={optimalRoute?.path_nodes || []}
                            onSelectCity={handleSelectCityFromMap}
                        />
                    </div>
                </main>
            </div>
        </Layout>
    );
}

export default RoutePlanner;