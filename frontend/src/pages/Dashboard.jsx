import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import NetworkBackground from "../components/NetworkBackground";
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

    // Continuous scroll reveal appear/disappear observer
    useEffect(() => {
        const observerCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                } else {
                    entry.target.classList.remove("is-visible");
                }
            });
        };

        const observerOptions = {
            threshold: 0.12,
            rootMargin: "0px 0px -30px 0px",
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        const revealElements = document.querySelectorAll(".scroll-reveal");
        revealElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="goroute-home-layout">
            {/* Animated Dynamic Graph Background */}
            <NetworkBackground />

            {/* Top Navigation Bar */}
            <Navbar />

            {/* Main Hero & Actions Area */}
            <main className="goroute-hero-container">
                {/* Hero Header */}
                <div className="hero-header-block scroll-reveal">
                    <h1 className="hero-title">Orchestrate Your Network</h1>
                    <p className="hero-description">
                        Build your custom distribution network, connect road corridors, and calculate
                        the most cost-effective routes in milliseconds.
                    </p>
                </div>

                {/* 3 Core Architecture Action Cards */}
                <div className="features-grid-container scroll-reveal">
                    {/* Card 1: Manage Cities */}
                    <div
                        className="feature-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate("/cities")}
                        onKeyDown={(e) => e.key === "Enter" && navigate("/cities")}
                    >
                        <div className="feature-icon-wrapper">
                            <svg className="feature-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                            Define distribution hubs, pin GPS coordinates, and manage all strategic nodes across your network.
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
                            <svg className="feature-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                            Establish links between hubs, assign distances & weights, and define custom freight pathways.
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
                            <svg className="feature-svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                            Compute guaranteed shortest paths with Dijkstra & A*, view trip costs, and animate freight traversal.
                        </p>
                        <div className="feature-action-link">
                            <span>Calculate Routes</span>
                            <span className="action-arrow">→</span>
                        </div>
                    </div>
                </div>

                {/* ========================================================
                   SECTION 1: WHY GOROUTE? (Monochrome Editorial Split)
                   ======================================================== */}
                <section className="editorial-split-section scroll-reveal">
                    <div className="split-left-lead">
                        <h2 className="why-goroute-giant-title">Why GoRoute?</h2>
                        <p className="split-lead-para">
                            Standard navigation tools only route along generic public roads with standard traffic.
                        </p>
                    </div>

                    <div className="split-right-content">
                        <div className="benefit-row">
                            <span className="benefit-num">01</span>
                            <div className="benefit-text">
                                <h3 className="benefit-heading">Custom Private Networks</h3>
                                <p className="benefit-detail">
                                    Create custom internal distribution nodes, factory campuses, and toll-restricted freight corridors that standard public map apps cannot model.
                                </p>
                            </div>
                        </div>

                        <div className="benefit-row">
                            <span className="benefit-num">02</span>
                            <div className="benefit-text">
                                <h3 className="benefit-heading">Multi-Stop Waypoints</h3>
                                <p className="benefit-detail">
                                    Sequence intermediate stops across national corridors with turn-by-turn distance and leg-by-leg transit breakdowns.
                                </p>
                            </div>
                        </div>

                        <div className="benefit-row">
                            <span className="benefit-num">03</span>
                            <div className="benefit-text">
                                <h3 className="benefit-heading">Freight & Fuel Intelligence</h3>
                                <p className="benefit-detail">
                                    Automatically calculate total distance, travel duration, diesel consumption (~4 km/L), and fleet operational expenditure before dispatch.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========================================================
                   SECTION 2: HOW IT WORKS
                   ======================================================== */}
                <section className="editorial-split-section scroll-reveal">
                    <div className="split-left-lead">
                        <h2 className="section-heading">How GoRoute Works</h2>
                        <p className="split-lead-para">
                            From defining your first distribution hub to dispatching optimized multi-leg itineraries in under a minute.
                        </p>
                    </div>

                    <div className="split-right-content">
                        <div className="timeline-flow-list">
                            <div className="timeline-item">
                                <div className="timeline-marker">1</div>
                                <div className="timeline-content">
                                    <h3 className="timeline-title">Add Your Hubs</h3>
                                    <p className="timeline-desc">
                                        Pin warehouses, distribution centers, or cities with automatic GPS coordinates and customizable hub tags.
                                    </p>
                                </div>
                            </div>

                            <div className="timeline-item">
                                <div className="timeline-marker">2</div>
                                <div className="timeline-content">
                                    <h3 className="timeline-title">Connect Road Pathways</h3>
                                    <p className="timeline-desc">
                                        Define one-way or two-way roads between your hubs and enter the exact road distance in kilometers.
                                    </p>
                                </div>
                            </div>

                            <div className="timeline-item">
                                <div className="timeline-marker">3</div>
                                <div className="timeline-content">
                                    <h3 className="timeline-title">Calculate & Dispatch</h3>
                                    <p className="timeline-desc">
                                        Pick Origin, Destination, and intermediate stops to get instant shortest paths, diesel costs, and live map playback.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========================================================
                   SECTION 3: REAL-WORLD USE CASES
                   ======================================================== */}
                <section className="editorial-split-section scroll-reveal">
                    <div className="split-left-lead">
                        <h2 className="section-heading">Who Uses GoRoute?</h2>
                        <p className="split-lead-para">
                            Engineered for organizations that require custom routing logic and granular control over freight logistics.
                        </p>
                    </div>

                    <div className="split-right-content">
                        <div className="industry-use-list">
                            <div className="industry-item">
                                <h3 className="industry-title">E-Commerce & Supply Chains</h3>
                                <p className="industry-desc">
                                    Optimize freight corridors connecting national sorting centers (Delhi, Mumbai, Bengaluru) to regional fulfillment hubs.
                                </p>
                            </div>

                            <div className="industry-item">
                                <h3 className="industry-title">Industrial & Factory Campuses</h3>
                                <p className="industry-desc">
                                    Map private internal haul roads, mining corridors, and plant delivery gates where public GPS fails.
                                </p>
                            </div>

                            <div className="industry-item">
                                <h3 className="industry-title">Fleet Dispatch & Cost Planning</h3>
                                <p className="industry-desc">
                                    Pre-calculate diesel consumption (~4 km/L) and freight cost (₹35/km) before vehicles leave the dispatch yard.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ========================================================
                   SECTION 4: QUICK CALL-TO-ACTION
                   ======================================================== */}
                <section className="cta-banner-section scroll-reveal">
                    <div className="cta-content">
                        <h2 className="cta-title">Ready to optimize your logistics routes?</h2>
                        <p className="cta-desc">Launch the interactive Route Planner and calculate shortest paths across the network.</p>
                        <button
                            type="button"
                            className="btn-launch-cta"
                            onClick={() => navigate("/route")}
                        >
                            Open Route Planner →
                        </button>
                    </div>
                </section>
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