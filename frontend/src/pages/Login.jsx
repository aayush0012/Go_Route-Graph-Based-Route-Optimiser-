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
            const detail = error.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : (error.message || "Login Failed");
            alert(msg);
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
            const detail = error.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : (error.message || "Guest Login Failed");
            alert(msg);
        } finally {
            setIsGuestLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-header">
                    <h1 className="login-brand">GoRoute</h1>
                    <p className="login-subtitle">Sign in to your account to continue</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
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

                    <div className="form-group">
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

                    <button type="submit" className="btn-primary-submit" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="login-divider">
                    <span>or</span>
                </div>

                <button
                    type="button"
                    className="btn-guest-submit"
                    onClick={handleGuestLogin}
                    disabled={isGuestLoading}
                >
                    {isGuestLoading ? "Entering..." : "Continue as Guest"}
                </button>

                <div className="login-footer">
                    <p>
                        Don't have an account?{" "}
                        <span onClick={() => navigate("/register")}>Register</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;