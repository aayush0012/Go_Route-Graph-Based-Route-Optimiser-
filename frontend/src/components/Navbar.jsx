import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Navbar.css";

function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get("/me");
                setUser(res.data);
            } catch (err) {
                // Cookie invalid or expired — user will be redirected by ProtectedRoute
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setMenuOpen(false);
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await api.post("/logout"); // Backend clears the HttpOnly cookie
        } catch (err) {
            // Proceed with redirect regardless
        }
        navigate("/");
    };

    const getInitials = () => {
        if (!user) return "GR";
        if (user.username) return user.username.substring(0, 2).toUpperCase();
        if (user.email) return user.email.substring(0, 2).toUpperCase();
        return "GR";
    };

    return (
        <header className="goroute-navbar-header">
            <div className="goroute-navbar-container">
                {/* Brand Logo */}
                <Link to="/dashboard" className="goroute-brand">
                    <span className="brand-text">GoRoute</span>
                </Link>

                {/* Navigation Links */}
                <nav className="goroute-nav-links">
                    <Link
                        to="/cities"
                        className={`goroute-nav-item ${location.pathname === "/cities" ? "active" : ""}`}
                    >
                        Manage Cities
                    </Link>
                    <Link
                        to="/roads"
                        className={`goroute-nav-item ${location.pathname === "/roads" ? "active" : ""}`}
                    >
                        Connect Roads
                    </Link>
                    <Link
                        to="/route"
                        className={`goroute-nav-item ${location.pathname === "/route" ? "active" : ""}`}
                    >
                        Route Planner
                    </Link>
                </nav>

                {/* Utility Icons & Profile */}
                <div className="goroute-nav-actions" ref={dropdownRef}>
                    {/* Settings Button */}
                    <button
                        type="button"
                        className="nav-icon-btn"
                        title="Route Engine Configuration"
                        onClick={() => navigate("/route")}
                    >
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>

                    {/* User Profile Avatar */}
                    <div className="user-avatar-wrapper">
                        <button
                            type="button"
                            className="user-avatar-btn"
                            onClick={() => {
                                setMenuOpen(!menuOpen);
                                setNotifOpen(false);
                            }}
                            title="Account & Settings"
                        >
                            <span className="avatar-initials">{getInitials()}</span>
                        </button>

                        {menuOpen && (
                            <div className="nav-flyout user-menu-flyout">
                                <div className="user-menu-header">
                                    <p className="user-menu-name">{user?.username || "Guest User"}</p>
                                    <p className="user-menu-email">{user?.email || "guest@goroute.com"}</p>
                                </div>
                                <div className="user-menu-divider"></div>
                                <Link to="/dashboard" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                                    Dashboard
                                </Link>
                                <Link to="/cities" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 7v14M8 7v14M13 7v14M18 7v14M3 7l9-4 9 4"/></svg>
                                    Manage Cities
                                </Link>
                                <Link to="/roads" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19L8 5M16 5l4 14M12 4v4M12 12v4M12 20v1"/></svg>
                                    Connect Roads
                                </Link>
                                <Link to="/route" className="user-menu-item" onClick={() => setMenuOpen(false)}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H10a4.5 4.5 0 0 1 0-9H15"/><circle cx="18" cy="5" r="3"/></svg>
                                    Route Planner
                                </Link>
                                <div className="user-menu-divider"></div>
                                <button type="button" className="user-menu-item logout-action" onClick={handleLogout}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Navbar;