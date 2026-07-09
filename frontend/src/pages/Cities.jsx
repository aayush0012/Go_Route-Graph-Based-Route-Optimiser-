import { useEffect, useState } from "react";
import api from "../services/api";
import Layout from "../components/Layout";
import "./Cities.css";

function Cities() {
    const [cities, setCities] = useState([]);
    const [cityName, setCityName] = useState("");
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

    const addCity = async () => {
        if (!cityName.trim()) return;

        setIsSaving(true);
        try {
            await api.post("/cities/", {
                name: cityName,
            });

            setCityName("");
            fetchCities();
        } catch (error) {
            alert(error.response?.data?.detail || "Failed to add city");
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
            <div className="cities-page">
                <h1>Cities</h1>
                <p className="subtitle">Keep the list of registered cities up to date.</p>

                <div className="city-form">
                    <div className="field">
                        <label htmlFor="city-name-input">City Name</label>
                        <input
                            id="city-name-input"
                            type="text"
                            placeholder="Enter city name"
                            value={cityName}
                            onChange={(e) => setCityName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") addCity();
                            }}
                            disabled={isSaving}
                        />
                    </div>

                    <button
                        type="button"
                        className="add-btn"
                        onClick={addCity}
                        disabled={isSaving}
                    >
                        {isSaving ? "Adding..." : "Add City"}
                    </button>
                </div>

                <div className="city-list">
                    {cities.length === 0 ? (
                        <p className="empty-text">No cities registered yet. Add one above.</p>
                    ) : (
                        cities.map((city, index) => (
                            <div key={city.id} className="city-item">
                                <span className="city-info">
                                    <span className="city-index">#{index + 1}</span>
                                    {city.name}
                                </span>

                                <button
                                    type="button"
                                    className="delete-btn"
                                    onClick={() => deleteCity(city.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default Cities;