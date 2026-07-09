import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    const logout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div className="header-brand">
                        <span className="logo-badge">🧭 RouteIQ</span>
                        <h1>Welcome back!</h1>
                        <p className="welcome-subtext">
                            Your active routing network is online and running. Delhi, Bengaluru, and other hubs are connected.
                        </p>
                    </div>
                    <button type="button" className="logout-btn" onClick={logout}>
                        Log out
                    </button>
                </div>

                <div className="card-grid">
                    <div 
                        className="action-card" 
                        onClick={() => navigate("/cities")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/cities")}
                    >
                        <h3>Manage Cities</h3>
                        <p>Add new supply hubs or remove old destinations from the active network.</p>
                        <span className="card-link">Go to Cities →</span>
                    </div>

                    <div 
                        className="action-card" 
                        onClick={() => navigate("/roads")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/roads")}
                    >
                        <h3>Connect Roads</h3>
                        <p>Link your hubs together, edit distance metrics, and configure pathways.</p>
                        <span className="card-link">Configure Roads →</span>
                    </div>

                    <div 
                        className="action-card" 
                        onClick={() => navigate("/route")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/route")}
                    >
                        <h3>Route Planner</h3>
                        <p>Calculate optimal routes using Dijkstra, Bellman-Ford, or A* algorithms.</p>
                        <span className="card-link">Plan a Route →</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;