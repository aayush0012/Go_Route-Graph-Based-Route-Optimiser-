import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {

    const location = useLocation();

    return (
        <nav className="navbar">

            <div className="logo">
                GoRoute 
            </div>

            <div className="nav-links">

                <Link
                    className={location.pathname === "/dashboard" ? "active" : ""}
                    to="/dashboard"
                >
                    Dashboard
                </Link>

                <Link
                    className={location.pathname === "/cities" ? "active" : ""}
                    to="/cities"
                >
                    Cities
                </Link>

                <Link
                    className={location.pathname === "/roads" ? "active" : ""}
                    to="/roads"
                >
                    Roads
                </Link>

                <Link
                    className={location.pathname === "/route" ? "active" : ""}
                    to="/route"
                >
                    Route Planner
                </Link>

            </div>

        </nav>
    );
}

export default Navbar;