import { useEffect, useState } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import "./RoutePlanner.css";

function RoutePlanner() {
    const [cities, setCities] = useState([]);
    const [loadingCities, setLoadingCities] = useState(true);

    const [sourceCity, setSourceCity] = useState("");
    const [destinationCity, setDestinationCity] = useState("");

    const [distance, setDistance] = useState(null);
    const [path, setPath] = useState([]);

    const [isSearching, setIsSearching] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [algorithm, setAlgorithm] = useState("dijkstra");
    const [stops, setStops] = useState([]);

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        try {
            const response = await api.get("/cities/");
            setCities(response.data);

            if (response.data.length > 0) {
                setSourceCity(response.data[0].id);
                setDestinationCity(response.data[Math.min(1, response.data.length - 1)].id);
            }
        } catch (error) {
            console.log(error);
            setErrorMsg("Couldn't load cities — try refreshing.");
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

    const findRoute = async () => {
        if (sourceCity === destinationCity) {
            setErrorMsg("Pick two different cities.");
            return;
        }

        const allWaypoints = [sourceCity, ...stops, destinationCity];
        for (let i = 0; i < allWaypoints.length - 1; i++) {
            if (Number(allWaypoints[i]) === Number(allWaypoints[i + 1])) {
                setErrorMsg("Consecutive stops cannot be the same city.");
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
        } catch (error) {
            setDistance(null);
            setPath([]);
            setErrorMsg(error.response?.data?.detail || "No route between those two.");
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <Layout>
            <div className="route-planner">
                <h1>Enter The Route </h1>
                <p className="subtitle">Lets find the shortest distance.</p>

                <div className="route-form">
                    <div className="field">
                        <label htmlFor="source">From</label>
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
                        className="swap-btn"
                        onClick={swapCities}
                        disabled={loadingCities}
                        aria-label="Swap"
                        title="Swap"
                    >
                        ⇄
                    </button>

                    <div className="field">
                        <label htmlFor="destination">To</label>
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

                    {stops.map((stopId, index) => (
                        <div key={index} className="field stop-field">
                            <div className="stop-header">
                                <label htmlFor={`stop-${index}`}>Stop {index + 1}</label>
                                <button
                                    type="button"
                                    className="remove-stop-btn"
                                    onClick={() => removeStop(index)}
                                    title="Remove Stop"
                                >
                                    ✕
                                </button>
                            </div>
                            <select
                                id={`stop-${index}`}
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
                        </div>
                    ))}

                    <div className="field algorithm-field">
                        <label htmlFor="algorithm">Routing Algorithm</label>
                        <select
                            id="algorithm"
                            value={algorithm}
                            onChange={(e) => setAlgorithm(e.target.value)}
                            disabled={loadingCities}
                        >
                            <option value="dijkstra">Dijkstra (Fastest)</option>
                            <option value="bellman_ford">Bellman-Ford (Standard)</option>
                            <option value="a_star">A* (Heuristic)</option>
                        </select>
                    </div>
                </div>

                <div className="planner-actions">
                    <button
                        type="button"
                        className="add-stop-btn"
                        onClick={addStop}
                        disabled={loadingCities}
                    >
                        ➕ Add Stop
                    </button>
                    
                    <button
                        type="button"
                        className="find-btn"
                        onClick={findRoute}
                        disabled={loadingCities || isSearching}
                    >
                        {isSearching ? "Looking…" : "Find the route"}
                    </button>
                </div>

                {errorMsg && <p className="error-text">{errorMsg}</p>}

                {distance !== null && (
                    <div className="result">
                        <p className="result-headline">
                            That's about <span className="result-distance">{distance} km</span>.
                        </p>
                        <p className="result-path">
                            {path.map((city, i) => (
                                <span key={i}>
                                    {city}
                                    {i < path.length - 1 && <span className="path-arrow"> → </span>}
                                </span>
                            ))}
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default RoutePlanner;