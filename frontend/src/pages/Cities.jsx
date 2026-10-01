import { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import { getCoordinatesForCityName } from "../components/RouteMap";
import { restoreMasterNetwork } from "../services/masterNetwork";
import "./Cities.css";

function Cities() {
    const [cities, setCities] = useState([]);
    const [cityName, setCityName] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const fetchCities = async () => {
        try {
            const response = await api.get("/cities/");
            const data = Array.isArray(response.data) ? response.data : [];
            setCities(data);
        } catch (error) {
            console.log(error);
            setCities([]);
        }
    };

    const handleResetToMaster = async () => {
        if (!window.confirm("Restore default network? This will reset your workspace to the standard hubs and corridors.")) {
            return;
        }
        try {
            setIsResetting(true);
            setErrorMsg("");
            setSuccessMsg("");
            await restoreMasterNetwork(api);
            await fetchCities();
            setSuccessMsg("Standard network successfully restored.");
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (error) {
            console.log(error);
            setErrorMsg("Failed to reset workspace.");
        } finally {
            setIsResetting(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    const addCity = async (e) => {
        if (e) e.preventDefault();
        if (!cityName.trim()) {
            setErrorMsg("Please enter a valid city name.");
            return;
        }

        setIsSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            await api.post("/cities/", {
                name: cityName.trim(),
                latitude: latitude !== "" ? parseFloat(latitude) : null,
                longitude: longitude !== "" ? parseFloat(longitude) : null,
            });

            setSuccessMsg(`City "${cityName.trim()}" successfully registered.`);
            setCityName("");
            setLatitude("");
            setLongitude("");
            await fetchCities();
            setTimeout(() => setSuccessMsg(""), 4000);
        } catch (error) {
            const detail = error.response?.data?.detail;
            let msg = "Failed to add city.";
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

    const deleteCity = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name || `City #${id}`}"? Associated roads will also be removed.`)) {
            return;
        }
        try {
            setDeletingId(id);
            setErrorMsg("");
            await api.delete(`/cities/${id}`);
            await fetchCities();
            setSuccessMsg(`City "${name || `City #${id}`}" deleted.`);
            setTimeout(() => setSuccessMsg(""), 3000);
        } catch (error) {
            console.log(error);
            const detail = error.response?.data?.detail;
            setErrorMsg(typeof detail === "string" ? detail : "Failed to delete city.");
        } finally {
            setDeletingId(null);
        }
    };

    const safeCities = Array.isArray(cities) ? cities.filter(Boolean) : [];

    // Filter cities based on search
    const filteredCities = useMemo(() => {
        if (!searchQuery.trim()) return safeCities;
        const q = searchQuery.toLowerCase().trim();
        return safeCities.filter(
            (c) =>
                (c.name && c.name.toLowerCase().includes(q)) ||
                (c.latitude && String(c.latitude).includes(q)) ||
                (c.longitude && String(c.longitude).includes(q))
        );
    }, [safeCities, searchQuery]);

    const formatCoord = (val, cName, isLat = true) => {
        if (val !== null && val !== undefined && val !== "") {
            const num = Number(val);
            if (!isNaN(num)) return num.toFixed(4);
        }
        if (cName) {
            const fallback = getCoordinatesForCityName(cName);
            if (fallback) {
                return isLat ? fallback[0].toFixed(4) : fallback[1].toFixed(4);
            }
        }
        return "—";
    };

    return (
        <Layout>
            <div className="cities-workspace">
                {/* Header Row */}
                <header className="workspace-header">
                    <div className="header-info">
                        <h1 className="header-title">City Hub Registry</h1>
                        <p className="header-subtitle">
                            Add and manage cities for your route network. If you leave coordinates empty, they will be found automatically.
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

                {/* Control Console: Add City */}
                <div className="city-control-console-card">
                    <div className="console-card-header">
                        <h3 className="console-card-title">Register New City Hub</h3>
                        <span className="console-header-hint">Coordinates are optional and added automatically if left blank</span>
                    </div>

                    <form className="city-control-console-form" onSubmit={addCity}>
                        <div className="console-fields-row">
                            <div className="console-field flex-2">
                                <label htmlFor="city-name-input">
                                    City Hub Name <span className="req-star">*</span>
                                </label>
                                <input
                                    id="city-name-input"
                                    type="text"
                                    placeholder="e.g. Hyderabad, Pune, Varanasi"
                                    value={cityName}
                                    onChange={(e) => setCityName(e.target.value)}
                                    disabled={isSaving}
                                    required
                                />
                            </div>

                            <div className="console-field">
                                <label htmlFor="city-lat-input">
                                    Latitude (°N) <span className="opt-tag">Optional</span>
                                </label>
                                <input
                                    id="city-lat-input"
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 17.3850"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="console-field">
                                <label htmlFor="city-lng-input">
                                    Longitude (°E) <span className="opt-tag">Optional</span>
                                </label>
                                <input
                                    id="city-lng-input"
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 78.4867"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    disabled={isSaving}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-add-city"
                                disabled={isSaving}
                            >
                                {isSaving ? "Registering..." : "+ Register Hub"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Full-Width Cities Table Section */}
                <div className="city-list-section">
                    <div className="section-header-toolbar">
                        <div className="section-title-wrap">
                            <h3 className="section-title">Registered City Hubs</h3>
                            <span className="count-text">({filteredCities.length})</span>
                        </div>

                        <div className="search-filter-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Filter city hubs by name or coords..."
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

                    {safeCities.length === 0 ? (
                        <div className="empty-cities-state">
                            <h4>No City Hubs Registered Yet</h4>
                            <p>Register your first city hub using the form above or click <strong>Restore Default Network</strong> to load standard hubs.</p>
                        </div>
                    ) : filteredCities.length === 0 ? (
                        <div className="empty-search-state">
                            <p>No hubs match <strong>"{searchQuery}"</strong></p>
                            <button
                                type="button"
                                className="btn-reset-search"
                                onClick={() => setSearchQuery("")}
                            >
                                Clear Search Filter
                            </button>
                        </div>
                    ) : (
                        <div className="city-table-container">
                            <table className="city-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "60px" }}>#</th>
                                        <th>City Name</th>
                                        <th>Latitude</th>
                                        <th>Longitude</th>
                                        <th style={{ width: "100px", textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCities.map((city, index) => {
                                        const latVal = formatCoord(city.latitude, city.name, true);
                                        const lngVal = formatCoord(city.longitude, city.name, false);

                                        return (
                                            <tr key={city.id || index} className="city-table-row">
                                                <td className="row-index-cell">{index + 1}</td>
                                                <td>
                                                    <span className="city-display-name">{city.name}</span>
                                                </td>
                                                <td>
                                                    <span className="coord-chip">
                                                        {latVal !== "—" ? `${latVal}° N` : "—"}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="coord-chip">
                                                        {lngVal !== "—" ? `${lngVal}° E` : "—"}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    <button
                                                        type="button"
                                                        className="btn-delete-city"
                                                        onClick={() => deleteCity(city.id, city.name)}
                                                        disabled={deletingId === city.id}
                                                        title={`Delete ${city.name}`}
                                                    >
                                                        {deletingId === city.id ? "..." : "Delete"}
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

export default Cities;