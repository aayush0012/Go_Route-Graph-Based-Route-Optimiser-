import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import { restoreMasterNetwork } from "../services/masterNetwork";
import "./Roads.css";

function Roads() {
    const [cities, setCities] = useState([]);
    const [roads, setRoads] = useState([]);
    const [loading, setLoading] = useState(true);

    const [sourceCity, setSourceCity] = useState("");
    const [destinationCity, setDestinationCity] = useState("");
    const [distance, setDistance] = useState("");
    const [isBidirectional, setIsBidirectional] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleResetToMaster = async () => {
        if (!window.confirm("Restore default network? This will reset your workspace to the standard hubs and corridors.")) {
            return;
        }
        try {
            setIsResetting(true);
            setErrorMsg("");
            setSuccessMsg("");
            await restoreMasterNetwork(api);
            await Promise.all([fetchCities(), fetchRoads()]);
            setSuccessMsg("Standard network successfully restored.");
            setTimeout(() => setSuccessMsg(""), 4000);
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

    const addRoad = async (e) => {
        if (e) e.preventDefault();
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
        setSuccessMsg("");

        try {
            await api.post("/roads/", {
                source_city_id: Number(sourceCity),
                destination_city_id: Number(destinationCity),
                distance: parsedDist,
                is_bidirectional: isBidirectional,
            });

            const srcObj = safeCities.find((c) => c && Number(c.id) === Number(sourceCity));
            const dstObj = safeCities.find((c) => c && Number(c.id) === Number(destinationCity));
            const srcName = srcObj ? srcObj.name : `City #${sourceCity}`;
            const dstName = dstObj ? dstObj.name : `City #${destinationCity}`;

            setSuccessMsg(`Road connection "${srcName} ➔ ${dstName}" added.`);
            setDistance("");
            await fetchRoads();
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (error) {
            const detail = error.response?.data?.detail;
            let msg = "Failed to add road connection.";
            if (typeof detail === "string") {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map((d) => (typeof d === "string" ? d : (d.msg || JSON.stringify(d)))).join(", ");
            } else if (detail && typeof detail === "object") {
                msg = JSON.stringify(detail);
            } else if (error.message) {
                msg = error.message.includes("Network Error") || error.code === "ERR_NETWORK"
                    ? "Network Error: Unable to connect to backend server. Make sure FastAPI is running."
                    : error.message;
            }
            setErrorMsg(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRoad = async (id, srcName, dstName) => {
        if (!window.confirm(`Are you sure you want to delete the road between "${srcName}" and "${dstName}"?`)) {
            return;
        }
        try {
            setDeletingId(id);
            setErrorMsg("");
            await api.delete(`/roads/${id}`);
            setRoads((prev) => (Array.isArray(prev) ? prev.filter((r) => r && r.id !== id) : []));
            setSuccessMsg(`Road "${srcName} ➔ ${dstName}" deleted.`);
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (error) {
            console.log(error);
            setErrorMsg("Failed to delete road connection.");
        } finally {
            setDeletingId(null);
        }
    };

    const safeCities = Array.isArray(cities) ? cities : [];
    const safeRoads = Array.isArray(roads) ? roads.filter(Boolean) : [];

    const getCityName = (id) => {
        const city = safeCities.find((c) => c && Number(c.id) === Number(id));
        return city ? city.name : `City #${id}`;
    };

    // Filter roads based on search
    const filteredRoads = useMemo(() => {
        if (!searchQuery.trim()) return safeRoads;
        const q = searchQuery.toLowerCase().trim();
        return safeRoads.filter((r) => {
            const sName = getCityName(r.source_city_id).toLowerCase();
            const dName = getCityName(r.destination_city_id).toLowerCase();
            return (
                sName.includes(q) ||
                dName.includes(q) ||
                (r.distance && String(r.distance).includes(q))
            );
        });
    }, [safeRoads, searchQuery, safeCities]);

    return (
        <Layout>
            <div className="roads-workspace">
                {/* Header Row */}
                <header className="workspace-header">
                    <div className="header-info">
                        <h1 className="header-title">Road Network Management</h1>
                        <p className="header-subtitle">
                            Connect city hubs with road corridors. If you leave distance empty, it will be calculated automatically from coordinates.
                        </p>
                    </div>
                    <button
                        type="button"
                        className="btn-restore-network"
                        onClick={handleResetToMaster}
                        disabled={isResetting}
                        title="Reset workspace to default hubs and highways"
                    >
                        🔄 {isResetting ? "Restoring..." : "Restore Default Network"}
                    </button>
                </header>

                {/* Neutral Alerts */}
                {errorMsg && (
                    <div className="console-alert-banner alert-neutral">
                        <span>Notice: {errorMsg}</span>
                        <button type="button" className="btn-close-alert" onClick={() => setErrorMsg("")}>✕</button>
                    </div>
                )}
                {successMsg && (
                    <div className="console-alert-banner alert-neutral">
                        <span>{successMsg}</span>
                        <button type="button" className="btn-close-alert" onClick={() => setSuccessMsg("")}>✕</button>
                    </div>
                )}

                {/* Control Console: Add Road */}
                <div className="road-control-console-card">
                    <div className="console-card-header">
                        <h3 className="console-card-title">Connect Road Corridor</h3>
                        <span className="console-header-hint">Distance is optional and calculated automatically if left blank</span>
                    </div>

                    <form className="road-control-console-form" onSubmit={addRoad}>
                        <div className="console-fields-row">
                            <div className="console-field">
                                <label htmlFor="road-source">
                                    Origin City <span className="req-star">*</span>
                                </label>
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
                                <label htmlFor="road-destination">
                                    Destination City <span className="req-star">*</span>
                                </label>
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
                                <label htmlFor="road-distance">
                                    Distance (km) <span className="opt-tag">Optional</span>
                                </label>
                                <input
                                    id="road-distance"
                                    type="number"
                                    placeholder="Auto-calculated if blank"
                                    value={distance}
                                    onChange={(e) => setDistance(e.target.value)}
                                    disabled={isSaving}
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

                            <button
                                type="submit"
                                className="btn-add-road"
                                disabled={loading || isSaving || safeCities.length === 0}
                            >
                                {isSaving ? "Connecting..." : "+ Connect Road"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Full-width Network Connections Table */}
                <div className="road-list-section">
                    <div className="section-header-toolbar">
                        <div className="section-title-wrap">
                            <h3 className="section-title">Connected Road Corridors</h3>
                            <span className="count-text">({filteredRoads.length})</span>
                        </div>

                        <div className="search-filter-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Filter road corridors by city name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="btn-clear-search"
                                    onClick={() => setSearchQuery("")}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-roads-state">
                            <p>Loading road network connections...</p>
                        </div>
                    ) : safeRoads.length === 0 ? (
                        <div className="empty-roads-state">
                            <h4>No Road Corridors Connected Yet</h4>
                            <p>Connect your first two city hubs using the form above or click <strong>Restore Default Network</strong> to load standard highways.</p>
                        </div>
                    ) : filteredRoads.length === 0 ? (
                        <div className="empty-search-state">
                            <p>No road corridors match <strong>"{searchQuery}"</strong></p>
                            <button
                                type="button"
                                className="btn-reset-search"
                                onClick={() => setSearchQuery("")}
                            >
                                Clear Search Filter
                            </button>
                        </div>
                    ) : (
                        <div className="road-table-container">
                            <table className="road-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "60px" }}>#</th>
                                        <th>Origin</th>
                                        <th>Direction</th>
                                        <th>Destination</th>
                                        <th>Distance</th>
                                        <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRoads.map((road, idx) => {
                                        const sName = getCityName(road.source_city_id);
                                        const dName = getCityName(road.destination_city_id);

                                        return (
                                            <tr key={road.id || idx} className="road-table-row">
                                                <td className="row-index-cell">{idx + 1}</td>
                                                <td>
                                                    <span className="city-display-name">{sName}</span>
                                                </td>
                                                <td>
                                                    <span className="badge-direction">
                                                        {road.is_bidirectional ? "Two-Way (⟷)" : "One-Way (→)"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="city-display-name">{dName}</span>
                                                </td>
                                                <td>
                                                    <span className="coord-chip">
                                                        {road.distance != null ? `${road.distance} km` : "Auto"}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <button
                                                        type="button"
                                                        className="btn-delete-road"
                                                        onClick={() => deleteRoad(road.id, sName, dName)}
                                                        disabled={deletingId === road.id}
                                                        title={`Delete road between ${sName} and ${dName}`}
                                                    >
                                                        {deletingId === road.id ? "..." : "Delete"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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