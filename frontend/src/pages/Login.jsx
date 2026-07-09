import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGuestLoading, setIsGuestLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post("/login", {
                email,
                password,
            });

            localStorage.setItem(
                "token",
                response.data.access_token
            );

            navigate("/dashboard");
        } catch (error) {
            alert(
                error.response?.data?.detail || "Login Failed"
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setIsGuestLoading(true);
        try {
            const response = await api.post("/login/guest");

            localStorage.setItem(
                "token",
                response.data.access_token
            );

            navigate("/dashboard");
        } catch (error) {
            alert(
                error.response?.data?.detail || "Guest Login Failed"
            );
        } finally {
            setIsGuestLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-left-panel">
                <div className="network-bg">
                    <div className="grid-overlay"></div>
                    <div className="node node-1"></div>
                    <div className="node node-2"></div>
                    <div className="node node-3"></div>
                    <div className="node node-4"></div>
                    <div className="connection conn-1-2"></div>
                    <div className="connection conn-2-3"></div>
                    <div className="connection conn-3-4"></div>
                    <div className="connection conn-4-1"></div>
                </div>
                <div className="brand-content">
                    <div className="logo-badge">🧭 RouteIQ</div>
                    <h1>Smart Route Optimization</h1>
                    <p className="tagline">Connect locations, analyze connections, and discover the most efficient paths instantly.</p>
                    
                    <ul className="feature-list">
                        <li>
                            <div>
                                <strong>Manage Locations</strong>
                                <p>Add and update cities dynamically inside a database.</p>
                            </div>
                        </li>
                        <li>
                            <div>
                                <strong>Map Road Connections</strong>
                                <p>Link cities, set distances, and create routes.</p>
                            </div>
                        </li>
                        <li>
                            <div>
                                <strong>Find Optimal Routes</strong>
                                <p>Compute the shortest path using Dijkstra's algorithm.</p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
            
            <div className="login-right-panel">
                <form className="login-form-box" onSubmit={handleLogin}>
                    <div className="form-header">
                        <h2>Welcome Back</h2>
                        <p>Sign in to manage your routes and network.</p>
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="primary-login-btn" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                    </button>

                    <div className="divider">
                        <span>or continue as guest</span>
                    </div>

                    <button
                        type="button"
                        className="guest-login-btn"
                        onClick={handleGuestLogin}
                        disabled={isGuestLoading}
                    >
                        {isGuestLoading ? "Entering..." : "Access as Guest"}
                    </button>

                    <p className="register-redirect">
                        Don't have an account? <span onClick={() => navigate("/register")}>Register here</span>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default Login;