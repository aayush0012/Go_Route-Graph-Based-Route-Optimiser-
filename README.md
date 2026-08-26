# GoRoute - Graph-Based Route Optimization Platform

GoRoute is a route planning and road network management platform built with FastAPI, PostgreSQL, and React. It models logistics networks as weighted graphs and calculates optimal travel paths using Dijkstra's and A* search algorithms, with support for intermediate waypoints and user-isolated workspaces.

---

## Links

- **Live Application:** https://backend-proj-blue.vercel.app/
- **GitHub Repository:** https://github.com/aayush0012/Go_Route-Graph-Based-Route-Optimiser-

---

## Features

- **Isolated User Workspaces:** Every user and guest gets their own private graph sandbox. Adding, editing, or deleting cities and roads in one account does not affect other users.
- **Master Network Template:** New accounts start with a standard baseline network of 12 hubs and 16 freight corridors across India. Users can restore this default map at any time using the reset option.
- **Shortest Path Routing:** Computes optimal paths using Dijkstra's algorithm (min-heap priority queue) or A* heuristic search.
- **Multi-Stop Routes:** Supports adding sequential intermediate stops (e.g. Delhi -> Jaipur -> Mumbai) with segment-by-segment distance breakdowns and comparisons against direct routes.
- **Coordinate-Based Distance Estimation:** Uses the Haversine formula to compute road distances from latitude and longitude coordinates if manual distances are not provided.
- **Authentication:** JWT-based authentication for user registration, login, and single-click guest access.
- **Interactive UI:** Responsive dashboard with Leaflet map visualization, road network management, and route summary metrics (extra fuel, transit time differences).

---

## Screenshots

### Dashboard
<p align="center">
  <img src="images/dashboard.png?v=2" width="900" alt="Dashboard View">
</p>

### Route Planner
<p align="center">
  <img src="images/route-planner.png?v=2" width="900" alt="Route Planner View">
</p>

### Cities Management
<p align="center">
  <img src="images/cities.png?v=2" width="900" alt="Cities Management View">
</p>

---

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Pydantic, Uvicorn, Python-Jose, Passlib / Bcrypt
- **Frontend:** React, React Router, TailwindCSS, Axios, Leaflet
- **Database:** PostgreSQL (Neon Serverless)
- **Deployment:** Render (Backend API), Vercel (Frontend SPA)

---

## Architecture

```
React Frontend (Vite)
        |
        v  (REST API with Bearer Token)
FastAPI Backend (Uvicorn)
        |
        v
SQLAlchemy ORM (User-Filtered Queries)
        |
        v
PostgreSQL Database
        |
        v
Pathfinding Engine (Dijkstra / A*)
```

---

## Folder Structure

```
RouteIQ/
|-- backend/
|   |-- app/
|   |   |-- api/                # Endpoints (user, city, road, route)
|   |   |-- core/               # Configuration
|   |   |-- database/           # Database engine & session setup
|   |   |-- models/             # SQLAlchemy database models
|   |   |-- schemas/            # Pydantic request/response schemas
|   |   |-- services/           # Pathfinding and workspace seeding logic
|   |   |-- utils/              # JWT and password hashing utilities
|   |   \-- main.py             # FastAPI app initialization
|   |-- Dockerfile
|   |-- docker-compose.yml
|   \-- requirements.txt
|
\-- frontend/
    |-- src/
    |   |-- components/         # Layout, Navbar, RouteMap
    |   |-- pages/              # Dashboard, Cities, Roads, RoutePlanner, Login, Register
    |   |-- services/           # Axios client instance
    |   |-- App.jsx             # Client routing
    |   \-- main.jsx            # React root
    |-- package.json
    \-- vite.config.js
```

---

## How Routing Works

The network is structured as a weighted graph where cities are vertices and roads are weighted edges (distances in km).

For multi-stop queries ($S \to W_1 \to W_2 \dots \to D$):
1. The engine splits the route into sub-segments between each consecutive pair of waypoints.
2. It runs the selected shortest-path algorithm (Dijkstra or A*) for each leg.
3. The paths and distances are combined into a final route summary alongside direct-route comparisons.

---

## API Reference

### Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/register` | Register a new user and seed private workspace |
| POST | `/login` | Log in with email and password, returns JWT token |
| POST | `/login/guest` | Single-click guest login with seeded workspace |
| GET | `/me` | Get current authenticated user profile |

### Cities

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/cities/` | Get all cities in the user's workspace |
| POST | `/cities/` | Add a new city (auto-detects coordinates if omitted) |
| DELETE | `/cities/{id}` | Delete a city and its connected roads |
| POST | `/cities/reset-to-master` | Reset workspace back to the default master network |

### Roads

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/roads/` | Get all road connections in the user's workspace |
| POST | `/roads/` | Add a road between two cities |
| DELETE | `/roads/{id}` | Delete a road connection |

### Route Calculation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/route/` | Compute shortest route with algorithm selection and stops |

---

## Author

**Aayush Bhatt**
- GitHub: https://github.com/aayush0012
- LinkedIn: https://www.linkedin.com/in/aayush-bhatt-3657b1314/
