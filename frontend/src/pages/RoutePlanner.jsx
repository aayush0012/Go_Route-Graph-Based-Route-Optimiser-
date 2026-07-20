import { useEffect, useState } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import RouteMap from "../components/RouteMap";
import "./RoutePlanner.css";

function RoutePlanner() {
    const [cities, setCities] = useState([]);
    const [roads, setRoads] = useState([]);
    const [loadingCities, setLoadingCities] = useState(true);

    const [sourceCity, setSourceCity] = useState("");
    const [destinationCity, setDestinationCity] = useState("");

    const [distance, setDistance] = useState(null);
    const [path, setPath] = useState([]);
    const [pathNodes, setPathNodes] = useState([]);
    const [segments, setSegments] = useState([]);

    const [optimalRoute, setOptimalRoute] = useState(null);
    const [comparison, setComparison] = useState(null);

    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [algorithm, setAlgorithm] = useState("dijkstra");
    const [stops, setStops] = useState([]);

    useEffect(() => {
        fetchCitiesAndRoads();
    }, []);

    const fetchCitiesAndRoads = async () => {
        try {
            const [citiesRes, roadsRes] = await Promise.all([
                api.get("/cities/"),
                api.get("/roads/")
            ]);
            setCities(citiesRes.data);
            setRoads(roadsRes.data);

            if (citiesRes.data.length > 0) {
                setSourceCity(citiesRes.data[0].id);
                setDestinationCity(citiesRes.data[Math.min(1, citiesRes.data.length - 1)].id);
            }
        } catch (error) {
            console.log(error);
            setErrorMsg("Network data unavailable.");
        } finally {
            setLoadingCities(false);
        }
    };

    const swapCities = () => {
        setSourceCity(destinationCity);
        setDestinationCity(sourceCity);
    };

    const addStop = () => {
        if (cities.length > 0) {
            setStops([...stops, cities[0].id]);
        }
    };

    const removeStop = (index) => {
        setStops(stops.filter((_, i) => i !== index));
    };

    const handleStopChange = (index, value) => {
        const newStops = [...stops];
        newStops[index] = value;
        setStops(newStops);
    };

    const handleSelectCityFromMap = (cityId, role) => {
        if (role === "source") {
            setSourceCity(cityId);
        } else if (role === "destination") {
            setDestinationCity(cityId);
        }
    };

    const findRoute = async () => {
        if (sourceCity === destinationCity) {
            setErrorMsg("Select two distinct cities.");
            return;
        }

        const allWaypoints = [sourceCity, ...stops, destinationCity];
        for (let i = 0; i < allWaypoints.length - 1; i++) {
            if (Number(allWaypoints[i]) === Number(allWaypoints[i + 1])) {
                setErrorMsg("Consecutive stops cannot be identical.");
                return;
            }
        }

        setIsSearching(true);
        setErrorMsg("");

        try {
            const response = await api.post("/route/", {
                source_city_id: Number(sourceCity),
                destination_city_id: Number(destinationCity),
                algorithm: algorithm,
                stops: stops.map(Number),
            });

            setDistance(response.data.distance);
            setPath(response.data.path);
            setPathNodes(response.data.path_nodes || []);
            setSegments(response.data.segments || []);
            setOptimalRoute(response.data.optimal_route || null);
            setComparison(response.data.comparison || null);
        } catch (error) {
            setDistance(null);
            setPath([]);
            setPathNodes([]);
            setSegments([]);
            setOptimalRoute(null);
            setComparison(null);
            setErrorMsg(error.response?.data?.detail || "Route unavailable.");
        } finally {
            setIsSearching(false);
        }
    };

    const averageSpeed = 70;
    const totalHours = distance ? distance / averageSpeed : 0;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const durationString = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

    return (
        <Layout>
            <div className="route-planner-workspace">
                <header className="workspace-header">
                    <div>
                        <h1 className="header-title">Route Optimization & Path Analytics</h1>
                        <p className="header-subtitle">Analyze, compute, and compare shortest paths across the network.</p>
                    </div>
                </header>

                {/* Horizontal Control Console */}
                <div className="control-console">
                    <div className="console-fields-row">
                        <div className="console-field">
                            <label htmlFor="source">Origin</label>
                            <select
                                id="source"
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

                        <button
                            type="button"
                            className="btn-swap-control"
                            onClick={swapCities}
                            disabled={loadingCities}
                            aria-label="Swap Cities"
                            title="Swap Origin and Destination"
                        >
                            ⇄
                        </button>

                        <div className="console-field">
                            <label htmlFor="destination">Destination</label>
                            <select
                                id="destination"
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

                        <div className="console-field field-algo">
                            <label htmlFor="algorithm">Algorithm</label>
                            <select
                                id="algorithm"
                                value={algorithm}
                                onChange={(e) => setAlgorithm(e.target.value)}
                                disabled={loadingCities}
                            >
                                <option value="dijkstra">Dijkstra (Shortest Weight)</option>
                                <option value="bellman_ford">Bellman-Ford</option>
                                <option value="a_star">A* Search (Spatial)</option>
                            </select>
                        </div>

                        <div className="console-actions">
                            <button
                                type="button"
                                className="btn-add-waypoint"
                                onClick={addStop}
                                disabled={loadingCities}
                            >
                                + Add Stop
                            </button>

                            <button
                                type="button"
                                className="btn-calculate-route"
                                onClick={findRoute}
                                disabled={loadingCities || isSearching}
                            >
                                {isSearching ? "Computing..." : "Calculate Route"}
                            </button>
                        </div>
                    </div>

                    {stops.length > 0 && (
                        <div className="console-waypoints-row">
                            <span className="waypoints-label">Waypoints:</span>
                            {stops.map((stopId, index) => (
                                <div key={index} className="waypoint-chip">
                                    <span>Stop {index + 1}:</span>
                                    <select
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
                                        className="btn-remove-chip"
                                        onClick={() => removeStop(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {errorMsg && <div className="console-error-message">{errorMsg}</div>}
                </div>

                {/* Map View Area */}
                <div className="workspace-map-section">
                    <RouteMap
                        cities={cities}
                        roads={roads}
                        sourceCityId={sourceCity}
                        destinationCityId={destinationCity}
                        stopCityIds={stops}
                        routeSegments={segments}
                        routePathNodes={pathNodes}
                        optimalPathNodes={optimalRoute?.path_nodes || []}
                        onSelectCity={handleSelectCityFromMap}
                    />
                </div>

                {/* Data Analytics & Route Comparison Section */}
                {distance !== null && (
                    <div className="analytics-results-section">
                        <div className="primary-summary-strip">
                            <div className="summary-stat">
                                <span className="stat-label">Calculated Distance</span>
                                <span className="stat-value highlight-val">{distance} km</span>
                            </div>

                            <div className="summary-stat">
                                <span className="stat-label">Est. Travel Time</span>
                                <span className="stat-value">{durationString}</span>
                            </div>

                            <div className="summary-stat summary-path">
                                <span className="stat-label">Computed Sequence</span>
                                <span className="stat-value path-text">{path.join(" → ")}</span>
                            </div>
                        </div>

                        {segments && segments.length > 0 && (
                            <div className="leg-breakdown-section">
                                <h3 className="section-title">Segment Breakdown</h3>
                                <div className="leg-table-container">
                                    <table className="leg-table">
                                        <thead>
                                            <tr>
                                                <th>Leg</th>
                                                <th>Origin</th>
                                                <th>Destination</th>
                                                <th>Distance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {segments.map((seg, idx) => (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td>{seg.source}</td>
                                                    <td>{seg.destination}</td>
                                                    <td>{seg.distance} km</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {comparison && optimalRoute && (
                            <div className="formal-comparison-section">
                                <h3 className="section-title">Route Comparison Analytics</h3>

                                {comparison.is_identical ? (
                                    <div className="optimal-notice">
                                        <span className="notice-badge">Optimal Path</span>
                                        <span>Selected route matches the direct shortest path ({distance} km).</span>
                                    </div>
                                ) : (
                                    <div className="comparison-grid-view">
                                        <div className="comparison-col">
                                            <div className="col-header">
                                                <span className="col-title">Selected Route</span>
                                                {stops.length > 0 && <span className="tag-neutral">{stops.length} Stop(s)</span>}
                                            </div>
                                            <div className="col-metrics">
                                                <div className="metric-item">
                                                    <span className="metric-key">Total Distance</span>
                                                    <span className="metric-val">{distance} km</span>
                                                </div>
                                                <div className="metric-item">
                                                    <span className="metric-key">Sequence</span>
                                                    <span className="metric-val">{path.join(" → ")}</span>
                                                </div>
                                                <div className="metric-item">
                                                    <span className="metric-key">Est. Duration</span>
                                                    <span className="metric-val">{durationString}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="comparison-col col-optimal">
                                            <div className="col-header">
                                                <span className="col-title">Shortest Direct Route</span>
                                                <span className="tag-success">Direct Optimal</span>
                                            </div>
                                            <div className="col-metrics">
                                                <div className="metric-item">
                                                    <span className="metric-key">Total Distance</span>
                                                    <span className="metric-val text-success">{optimalRoute.distance} km</span>
                                                </div>
                                                <div className="metric-item">
                                                    <span className="metric-key">Sequence</span>
                                                    <span className="metric-val">{optimalRoute.path.join(" → ")}</span>
                                                </div>
                                                <div className="metric-item">
                                                    <span className="metric-key">Est. Duration</span>
                                                    <span className="metric-val">
                                                        {Math.floor(optimalRoute.distance / 70) > 0 ? `${Math.floor(optimalRoute.distance / 70)} hr ` : ''}
                                                        {Math.round(((optimalRoute.distance / 70) % 1) * 60)} min
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="comparison-delta-panel">
                                            <div className="delta-box">
                                                <span className="delta-title">Distance Difference</span>
                                                <span className="delta-num">+{comparison.extra_distance} km (+{comparison.extra_distance_pct}%)</span>
                                            </div>
                                            <div className="delta-box">
                                                <span className="delta-title">Direct Path Time Savings</span>
                                                <span className="delta-num">+{comparison.extra_time_minutes} min</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default RoutePlanner;