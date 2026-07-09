import { useEffect, useState } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import "./Roads.css";

function Roads() {
    const [cities, setCities] = useState([]);
    const [roads, setRoads] = useState([]);
    const [loading, setLoading] = useState(true);

    const [sourceCity, setSourceCity] = useState("");
    const [destinationCity, setDestinationCity] = useState("");
    const [distance, setDistance] = useState("");
    const [isBidirectional, setIsBidirectional] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

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
        }
    };

    const fetchRoads = async () => {
        try {
            const response = await api.get("/roads/");
            setRoads(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        Promise.all([fetchCities(), fetchRoads()]).finally(() => setLoading(false));
    }, []);

    const addRoad = async () => {
        if (!distance || Number(distance) <= 0) {
            setErrorMsg("Distance has to be more than zero.");
            return;
        }
        if (sourceCity === destinationCity) {
            setErrorMsg("Pick two different cities.");
            return;
        }

        setIsSaving(true);
        setErrorMsg("");

        try {
            await api.post("/roads/", {
                source_city_id: Number(sourceCity),
                destination_city_id: Number(destinationCity),
                distance: Number(distance),
                is_bidirectional: isBidirectional,
            });

            setDistance("");
            fetchRoads();
        } catch (error) {
            setErrorMsg(error.response?.data?.detail || "Couldn't add that one.");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRoad = async (id) => {
        try {
            await api.delete(`/roads/${id}`);
            setRoads((prev) => prev.filter((r) => r.id !== id));
        } catch (error) {
            console.log(error);
        }
    };

    const getCityName = (id) => {
        const city = cities.find((c) => c.id === id);
        return city ? city.name : "Unknown";
    };

    return (
        <Layout>
            <div className="roads">
                <h1>Roads</h1>
                <p className="subtitle">Wire up the connections between cities.</p>

                <div className="roads-guide">
                    <h3>💡 How to connect hubs</h3>
                    <ul>
                        <li>Select a start (<strong>From</strong>) and destination (<strong>To</strong>) city.</li>
                        <li>Set the driving distance (serves as route search weights).</li>
                        <li>Check <strong>Two-way</strong> if traffic travels in both directions.</li>
                    </ul>
                </div>

                <div className="road-form">
                    <div className="field">
                        <label htmlFor="road-source">From</label>
                        <select
                            id="road-source"
                            value={sourceCity}
                            onChange={(e) => setSourceCity(e.target.value)}
                            disabled={loading}
                        >
                            {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label htmlFor="road-destination">To</label>
                        <select
                            id="road-destination"
                            value={destinationCity}
                            onChange={(e) => setDestinationCity(e.target.value)}
                            disabled={loading}
                        >
                            {cities.map((city) => (
                                <option key={city.id} value={city.id}>
                                    {city.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field field-narrow">
                        <label htmlFor="road-distance">Distance (km)</label>
                        <input
                            id="road-distance"
                            type="number"
                            placeholder="0"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                        />
                    </div>

                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={isBidirectional}
                            onChange={(e) => setIsBidirectional(e.target.checked)}
                        />
                        Two-way
                    </label>

                    <button type="button" className="add-btn" onClick={addRoad} disabled={loading || isSaving}>
                        {isSaving ? "Adding…" : "Add road"}
                    </button>
                </div>

                {errorMsg && <p className="error-text">{errorMsg}</p>}

                <div className="road-list">
                    {loading && <p className="empty-text">Loading…</p>}

                    {!loading && roads.length === 0 && (
                        <p className="empty-text">No roads yet — add one above to get started.</p>
                    )}

                    {!loading &&
                        roads.map((road) => (
                            <div key={road.id} className="road-row">
                                <span className="road-row-text">
                                    {getCityName(road.source_city_id)}
                                    <span className="arrow">{road.is_bidirectional ? " ⟷ " : " → "}</span>
                                    {getCityName(road.destination_city_id)}
                                    <span className="dot"> · </span>
                                    {road.distance} km
                                </span>

                                <button
                                    type="button"
                                    className="delete-btn"
                                    onClick={() => deleteRoad(road.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                </div>
            </div>
        </Layout>
    );
}

export default Roads;