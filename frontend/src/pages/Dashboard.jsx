import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    // Keyboard shortcuts: 1 -> Cities, 2 -> Roads, 3 -> Route Planner
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (e.key === "1") navigate("/cities");
            if (e.key === "2") navigate("/roads");
            if (e.key === "3") navigate("/route");
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    return (
        <div className="goroute-home-layout">
            {/* Top Navigation Bar */}
            <Navbar />

            {/* Main Hero & Actions Area */}
            <main className="goroute-hero-container">
                {/* Hero Header */}
                <div className="hero-header-block">
                    <h1 className="hero-title">Orchestrate Your Network</h1>
                    <p className="hero-description">
                        Seamlessly manage infrastructure, define connections, and optimize paths
                        with our precision routing intelligence.
                    </p>
                </div>

                {/* 3 Core Architecture Cards */}
                <div className="features-grid-container">
                    {/* Card 1: Manage Cities */}
                    <div
                        className="feature-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate("/cities")}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/cities")}
                    >
                        <div className="feature-icon-wrapper">
                            <svg className="feature-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="8" height="17" rx="0.5" />
                                <rect x="13" y="9" width="8" height="12" rx="0.5" />
                                <line x1="5.5" y1="8" x2="6.5" y2="8" />
                                <line x1="8.5" y1="8" x2="9.5" y2="8" />
                                <line x1="5.5" y1="12" x2="6.5" y2="12" />
                                <line x1="8.5" y1="12" x2="9.5" y2="12" />
                                <line x1="5.5" y1="16" x2="6.5" y2="16" />
                                <line x1="8.5" y1="16" x2="9.5" y2="16" />
                                <line x1="15.5" y1="13" x2="16.5" y2="13" />
                                <line x1="18.5" y1="13" x2="19.5" y2="13" />
                                <line x1="15.5" y1="17" x2="16.5" y2="17" />
                                <line x1="18.5" y1="17" x2="19.5" y2="17" />
                            </svg>
                        </div>
                        <h2 className="feature-card-title">Manage Cities</h2>
                        <p className="feature-card-desc">
                            Define nodes, configure metadata, and establish the core geographical
                            anchors of your routing network.
                        </p>
                        <div className="feature-action-link">
                            <span>Explore Nodes</span>
                            <span className="action-arrow">→</span>
                        </div>
                    </div>

                    {/* Card 2: Connect Roads */}
                    <div
                        className="feature-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate("/roads")}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/roads")}
                    >
                        <div className="feature-icon-wrapper">
                            <svg className="feature-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="6" y1="3" x2="6" y2="21" strokeDasharray="3 3" />
                                <line x1="18" y1="3" x2="18" y2="21" />
                                <line x1="3" y1="9" x2="9" y2="9" />
                                <line x1="15" y1="15" x2="21" y2="15" />
                                <circle cx="6" cy="9" r="1.5" fill="currentColor" />
                                <circle cx="18" cy="15" r="1.5" fill="currentColor" />
                            </svg>
                        </div>
                        <h2 className="feature-card-title">Connect Roads</h2>
                        <p className="feature-card-desc">
                            Establish precise topographical links, assign weights, and build the
                            physical or logical pathways between your cities.
                        </p>
                        <div className="feature-action-link">
                            <span>Build Paths</span>
                            <span className="action-arrow">→</span>
                        </div>
                    </div>

                    {/* Card 3: Route Planner */}
                    <div
                        className="feature-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate("/route")}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/route")}
                    >
                        <div className="feature-icon-wrapper">
                            <svg className="feature-svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="19" r="2" fill="currentColor" />
                                <path d="M12 17V12" />
                                <path d="M12 12C12 9 8 8 6 6" />
                                <path d="M12 12C12 9 16 8 18 6" />
                                <polyline points="4 8 6 6 8 8" />
                                <polyline points="16 8 18 6 20 8" />
                            </svg>
                        </div>
                        <h2 className="feature-card-title">Route Planner</h2>
                        <p className="feature-card-desc">
                            Calculate optimal trajectories, analyze distances, and deploy shortest-path
                            routing algorithms across your network.
                        </p>
                        <div className="feature-action-link">
                            <span>Calculate Routes</span>
                            <span className="action-arrow">→</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Minimal & Clean Footer */}
            <footer className="goroute-footer">
                <div className="goroute-footer-inner">
                    <div className="footer-left">
                        <span className="footer-brand-name">GoRoute</span>
                        <span className="footer-dot">•</span>
                        <p className="footer-copyright">
                            © {new Date().getFullYear()} GoRoute. All rights reserved.
                        </p>
                    </div>

                    <div className="footer-right">
                        <button type="button" className="footer-nav-link" onClick={() => navigate("/cities")}>
                            Cities
                        </button>
                        <button type="button" className="footer-nav-link" onClick={() => navigate("/roads")}>
                            Roads
                        </button>
                        <button type="button" className="footer-nav-link" onClick={() => navigate("/route")}>
                            Route Planner
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Dashboard;