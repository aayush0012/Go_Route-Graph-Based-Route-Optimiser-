import { useEffect, useState } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import "./Cities.css";

function Cities() {
    const [cities, setCities] = useState([]);
    const [cityName, setCityName] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

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
        if (!window.confirm("Restore official master network? This will reset your workspace to the standard 12 hubs and 16 freight corridors.")) {
            return;
        }
        try {
            setIsResetting(true);
            setErrorMsg("");
            await api.post("/cities/reset-to-master");
            await fetchCities();
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

        try {
            await api.post("/cities/", {
                name: cityName.trim(),
                latitude: latitude !== "" ? parseFloat(latitude) : null,
                longitude: longitude !== "" ? parseFloat(longitude) : null,
            });

            setCityName("");
            setLatitude("");
            setLongitude("");
            await fetchCities();
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
                    ? "Network Error: Unable to connect to backend server. Make sure the backend server (FastAPI) is running."
                    : error.message;
            }
            setErrorMsg(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteCity = async (id) => {
        try {
            setErrorMsg("");
            await api.delete(`/cities/${id}`);
            await fetchCities();
        } catch (error) {
            console.log(error);
            const detail = error.response?.data?.detail;
            setErrorMsg(typeof detail === "string" ? detail : "Failed to delete city.");
        }
    };

    const safeCities = Array.isArray(cities) ? cities.filter(Boolean) : [];

    const formatCoord = (val) => {
        if (val === null || val === undefined || val === "") return "—";
        const num = Number(val);
        return isNaN(num) ? "—" : num.toFixed(4);
    };

    return (
        <Layout>
            <div className="cities-workspace">
                <header className="workspace-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <h1 className="header-title">City Hub Registry</h1>
                        <p className="header-subtitle">
                            Register and manage network city hubs and spatial coordinates. Leaving coordinates empty auto-detects latitude and longitude via geocoding.
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
                <form className="city-control-console" onSubmit={addCity}>
                    <div className="console-fields-row">
                        <div className="console-field">
                            <label htmlFor="city-name-input">City Name</label>
                            <input
                                id="city-name-input"
                                type="text"
                                placeholder="e.g. Mumbai, Delhi, Mysore"
                                value={cityName}
                                onChange={(e) => setCityName(e.target.value)}
                                disabled={isSaving}
                                required
                            />
                        </div>

                        <div className="console-field">
                            <label htmlFor="city-lat-input">Latitude (Optional)</label>
                            <input
                                id="city-lat-input"
                                type="number"
                                step="any"
                                placeholder="Auto-detected if empty"
                                value={latitude}
                                onChange={(e) => setLatitude(e.target.value)}
                                disabled={isSaving}
                            />
                        </div>

                        <div className="console-field">
                            <label htmlFor="city-lng-input">Longitude (Optional)</label>
                            <input
                                id="city-lng-input"
                                type="number"
                                step="any"
                                placeholder="Auto-detected if empty"
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
                            {isSaving ? "Registering..." : "Register City"}
                        </button>
                    </div>

                    {errorMsg && <div className="console-error-message">{errorMsg}</div>}
                </form>

                {/* Full-Width Cities Table */}
                <div className="city-list-section">
                    <h3 className="section-title">Registered City Hubs</h3>
                    {safeCities.length === 0 ? (
                        <p className="empty-text">No city hubs registered yet. Use the console above to add cities.</p>
                    ) : (
                        <div className="city-table-container">
                            <table className="city-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>City Name</th>
                                        <th>Latitude</th>
                                        <th>Longitude</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeCities.map((city, index) => (
                                        <tr key={city.id || index}>
                                            <td>{index + 1}</td>
                                            <td className="font-semibold">{city.name}</td>
                                            <td className="font-mono">{formatCoord(city.latitude)}</td>
                                            <td className="font-mono">{formatCoord(city.longitude)}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="btn-delete-city"
                                                    onClick={() => deleteCity(city.id)}
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

export default Cities;