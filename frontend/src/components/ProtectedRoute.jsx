import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";

function ProtectedRoute({ children }) {
    const [authState, setAuthState] = useState("loading"); // "loading" | "authenticated" | "unauthenticated"

    useEffect(() => {
        // Cookie is HttpOnly — JS can't read it directly.
        // Verify auth by calling /me; a 200 means the cookie is valid.
        api.get("/me")
            .then(() => setAuthState("authenticated"))
            .catch(() => setAuthState("unauthenticated"));
    }, []);

    if (authState === "loading") {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                background: "#0a0a0f",
                color: "#888"
            }}>
                Verifying session...
            </div>
        );
    }

    if (authState === "unauthenticated") {
        return <Navigate to="/" />;
    }

    return children;
}

export default ProtectedRoute;