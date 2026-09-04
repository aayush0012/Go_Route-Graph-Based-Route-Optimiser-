import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

// One-time migration: remove legacy localStorage token (now using HttpOnly cookies)
localStorage.removeItem("token");
localStorage.removeItem("user");

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);