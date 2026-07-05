import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Register.css";

function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleRegister = async (e) => {
        e.preventDefault();

        try {
            await api.post("/register", {
                username,
                email,
                password,
            });

            alert("Registration Successful");

            navigate("/");

        } catch (error) {
            alert(error.response?.data?.detail || "Registration Failed");
        }
    };

    return (
        <div className="register-container">

            <form
                className="register-box"
                onSubmit={handleRegister}
            >

                <h1>GoRoute</h1>

                <h2>Create Account</h2>

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button type="submit">
                    Register
                </button>

                <p
                    style={{
                        marginTop: "10px",
                        cursor: "pointer",
                        color: "blue",
                    }}
                    onClick={() => navigate("/")}
                >
                    Already have an account? Login
                </p>

            </form>

        </div>
    );
}

export default Register;