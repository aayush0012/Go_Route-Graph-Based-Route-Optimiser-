import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NetworkBackground from "../components/NetworkBackground";
import api from "../services/api";
import "./Login.css";

function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg("");

        try {
            await api.post("/register", {
                username,
                email,
                password,
            });

            navigate("/");
        } catch (error) {
            const detail = error.response?.data?.detail;
            const msg = typeof detail === "string" ? detail : (error.message || "Registration Failed");
            setErrorMsg(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            {/* Ambient Background Animation */}
            <NetworkBackground />

            <div className="login-card">
                <div className="login-header">
                    <h1 className="login-brand">GoRoute</h1>
                    <p className="login-subtitle">Create your network workspace account</p>
                </div>

                {errorMsg && <div className="login-error-banner">{errorMsg}</div>}

                <form className="login-form" onSubmit={handleRegister}>
                    <div className="form-group">
                        <label htmlFor="username">Full Name / Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="johndoe"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
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
                        {isLoading ? "Creating Account..." : "Create Workspace Account"}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        Already have an account?{" "}
                        <span onClick={() => navigate("/")}>Sign In</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;