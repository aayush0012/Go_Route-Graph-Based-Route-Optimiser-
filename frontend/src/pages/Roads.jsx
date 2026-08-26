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
    const [isResetting, setIsResetting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleResetToMaster = async () => {
        if (!window.confirm("Restore official master network? This will reset your workspace to the standard 12 hubs and 16 freight corridors.")) {
            return;
        }
        try {
            setIsResetting(true);
            setErrorMsg("");
            await api.post("/cities/reset-to-master");
            await Promise.all([fetchCities(), fetchRoads()]);
        } catch (error) {
            console.log(error);
            setErrorMsg("Failed to reset workspace.");
        } finally {
            setIsResetting(false);
        }
    };


    const fetchCities = async () => {
        try {
            const response = await api.get("/cities/");
            const data = Array.isArray(response.data) ? response.data : [];
            setCities(data);

            if (data.length > 0) {
                setSourceCity((prev) => (prev && data.some((c) => Number(c.id) === Number(prev)) ? prev : data[0].id));
                setDestinationCity((prev) => (prev && data.some((c) => Number(c.id) === Number(prev)) ? prev : data[Math.min(1, data.length - 1)].id));
            }
        } catch (error) {
            console.log(error);
            setCities([]);
        }
    };

    const fetchRoads = async () => {
        try {
            const response = await api.get("/roads/");
            const data = Array.isArray(response.data) ? response.data : [];
            setRoads(data);
        } catch (error) {
            console.log(error);
            setRoads([]);
        }
    };

    useEffect(() => {
        Promise.all([fetchCities(), fetchRoads()]).finally(() => setLoading(false));
    }, []);

    const addRoad = async () => {
        if (!sourceCity || !destinationCity) {
            setErrorMsg("Please select both Origin and Destination cities.");
            return;
        }

        if (Number(sourceCity) === Number(destinationCity)) {
            setErrorMsg("Select two distinct cities.");
            return;
        }

        const trimmedDist = String(distance || "").trim();
        const parsedDist = trimmedDist !== "" && !isNaN(trimmedDist) && Number(trimmedDist) > 0
            ? Math.round(Number(trimmedDist))
            : null;

        setIsSaving(true);
        setErrorMsg("");

        try {
            await api.post("/roads/", {
                source_city_id: Number(sourceCity),
                destination_city_id: Number(destinationCity),
                distance: parsedDist,
                is_bidirectional: isBidirectional,
            });

            setDistance("");
            await fetchRoads();
        } catch (error) {
            const detail = error.response?.data?.detail;
            let msg = "Couldn't add road connection.";
            if (typeof detail === "string") {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map((d) => (typeof d === "string" ? d : (d.msg || JSON.stringify(d)))).join(", ");
            } else if (detail && typeof detail === "object") {
                msg = JSON.stringify(detail);
            } else if (error.message) {
                msg = error.message.includes("Network Error") || error.code === "ERR_NETWORK"
                    ? "Network Error: Unable to connect to backend server. Make sure the backend (FastAPI) is running."
                    : error.message;
            }
            setErrorMsg(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRoad = async (id) => {
        try {
            await api.delete(`/roads/${id}`);
            setRoads((prev) => (Array.isArray(prev) ? prev.filter((r) => r && r.id !== id) : []));
        } catch (error) {
            console.log(error);
        }
    };

    const safeCities = Array.isArray(cities) ? cities : [];
    const safeRoads = Array.isArray(roads) ? roads.filter(Boolean) : [];

    const getCityName = (id) => {
        const city = safeCities.find((c) => c && Number(c.id) === Number(id));
        return city ? city.name : `City #${id}`;
    };

    return (
        <Layout>
            <div className="roads-workspace">
                <header className="workspace-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <h1 className="header-title">Road Network Management</h1>
                        <p className="header-subtitle">
                            Connect city hubs, define edge weights, and configure directional traffic rules. Leaving distance empty auto-calculates distance from GPS coordinates.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetToMaster}
                        disabled={isResetting}
                        style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            padding: "0.55rem 1rem",
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            cursor: isResetting ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            transition: "all 0.2s ease",
                        }}
                    >
                        🔄 {isResetting ? "Restoring..." : "Restore Default Network"}
                    </button>
                </header>

                {/* Horizontal Control Console */}
                <div className="road-control-console">
                    <div className="console-fields-row">
                        <div className="console-field">
                            <label htmlFor="road-source">From</label>
                            <select
                                id="road-source"
                                value={sourceCity}
                                onChange={(e) => setSourceCity(e.target.value)}
                                disabled={loading || safeCities.length === 0}
                            >
                                {safeCities.map((city) => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="console-field">
                            <label htmlFor="road-destination">To</label>
                            <select
                                id="road-destination"
                                value={destinationCity}
                                onChange={(e) => setDestinationCity(e.target.value)}
                                disabled={loading || safeCities.length === 0}
                            >
                                {safeCities.map((city) => (
                                    <option key={city.id} value={city.id}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="console-field field-dist">
                            <label htmlFor="road-distance">Distance (km) - Optional</label>
                            <input
                                id="road-distance"
                                type="number"
                                placeholder="Auto-calculated if empty"
                                value={distance}
                                onChange={(e) => setDistance(e.target.value)}
                            />
                        </div>

                        <div className="console-field field-checkbox">
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={isBidirectional}
                                    onChange={(e) => setIsBidirectional(e.target.checked)}
                                />
                                Two-way
                            </label>
                        </div>

                        <button type="button" className="btn-add-road" onClick={addRoad} disabled={loading || isSaving}>
                            {isSaving ? "Adding..." : "Add Road"}
                        </button>
                    </div>

                    {errorMsg && <div className="console-error-message">{errorMsg}</div>}
                </div>

                {/* Full-width Network Connections Table */}
                <div className="road-list-section">
                    <h3 className="section-title">Connected Network Edges</h3>
                    {loading && <p className="empty-text">Loading network connections...</p>}

                    {!loading && safeRoads.length === 0 && (
                        <p className="empty-text">No connected roads configured yet.</p>
                    )}

                    {!loading && safeRoads.length > 0 && (
                        <div className="road-table-container">
                            <table className="road-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Origin</th>
                                        <th>Direction</th>
                                        <th>Destination</th>
                                        <th>Distance</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeRoads.map((road, idx) => (
                                        <tr key={road.id || idx}>
                                            <td>{idx + 1}</td>
                                            <td className="font-semibold">{getCityName(road.source_city_id)}</td>
                                            <td>
                                                <span className="badge-direction">
                                                    {road.is_bidirectional ? "Bidirectional (⟷)" : "One-Way (→)"}
                                                </span>
                                            </td>
                                            <td className="font-semibold">{getCityName(road.destination_city_id)}</td>
                                            <td className="font-mono">{road.distance != null ? `${road.distance} km` : "—"}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-delete-road"
                                                    onClick={() => deleteRoad(road.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default Roads;