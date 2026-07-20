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

    const fetchCities = async () => {
        try {
            const response = await api.get("/cities/");
            setCities(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    const addCity = async (e) => {
        if (e) e.preventDefault();
        if (!cityName.trim()) return;

        setIsSaving(true);
        try {
            await api.post("/cities/", {
                name: cityName,
                latitude: latitude !== "" ? parseFloat(latitude) : null,
                longitude: longitude !== "" ? parseFloat(longitude) : null,
            });

            setCityName("");
            setLatitude("");
            setLongitude("");
            fetchCities();
        } catch (error) {
            const detail = error.response?.data?.detail;
            let msg = "Failed to add city.";
            if (typeof detail === "string") {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map((d) => d.msg).join(", ");
            } else if (error.message) {
                msg = error.message.includes("Network Error") || error.code === "ERR_NETWORK"
                    ? "Network Error: Unable to connect to backend server. Make sure the backend server (FastAPI) is running."
                    : error.message;
            }
            alert(msg);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteCity = async (id) => {
        try {
            await api.delete(`/cities/${id}`);
            fetchCities();
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <Layout>
            <div className="cities-workspace">
                <header className="workspace-header">
                    <div>
                        <h1 className="header-title">City Hub Registry</h1>
                        <p className="header-subtitle">
                            Register and manage network city hubs and spatial coordinates. Leaving coordinates empty auto-detects latitude and longitude via geocoding.
                        </p>
                    </div>
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
                </form>

                {/* Full-Width Cities Table */}
                <div className="city-list-section">
                    <h3 className="section-title">Registered City Hubs</h3>
                    {cities.length === 0 ? (
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
                                    {cities.map((city, index) => (
                                        <tr key={city.id}>
                                            <td>{index + 1}</td>
                                            <td className="font-semibold">{city.name}</td>
                                            <td className="font-mono">
                                                {city.latitude !== null ? city.latitude.toFixed(4) : "—"}
                                            </td>
                                            <td className="font-mono">
                                                {city.longitude !== null ? city.longitude.toFixed(4) : "—"}
                                            </td>
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