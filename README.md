# GoRoute - Graph-Based Route Optimization Platform

A full-stack logistics and route optimization platform that enables users to model city networks, connect roads, and compute optimal routes between locations using **Dijkstra** and **A\*** graph algorithms, with support for **dynamic intermediate stops** and **user-isolated sandbox workspaces**.

---

## Live Demo

- **Web Application:** https://backend-proj-blue.vercel.app/
- **Source Code Repository:** https://github.com/aayush0012/Go_Route-Graph-Based-Route-Optimiser-

---

## Features

- **Multi-Tenant Sandboxes:** Each registered user and guest receives an isolated private road network workspace. Modifications, custom hubs, and deleted roads in one workspace do not affect other users.
- **Master Network Template & Recovery:** A protected global master logistics dataset (12 key hubs and 16 freight corridors) is auto-seeded on account creation, with a one-click restore action (`/cities/reset-to-master`) to recover baseline state.
- **Multi-Algorithm Routing Engine:**
  - **Dijkstra's Algorithm:** Fast greedy shortest-path search using a min-heap priority queue ($O((V+E)\log V)$).
  - **A\* Search Algorithm:** Heuristic-guided search utilizing spatial coordinate evaluation.
- **Dynamic Multi-Hop Waypoint Routing:** Supports sequential intermediate stops (e.g., Delhi -> Bengaluru -> Mysore) with aggregate distance calculations, segment breakdowns, and comparison against direct transit routes.
- **Geodesic Distance Auto-Computation:** Automatically calculates real-world edge distances from GPS coordinates using the Haversine formula when explicit distances are omitted.
- **Secure Authentication:** Stateless JWT-based authentication, password hashing with bcrypt/passlib, and role/user-scoped database operations.
- **Interactive UI Dashboard:** Built with React and styled with a modern, responsive layout.

---

## Application Preview

### Dashboard
<p align="center">
  <img src="images/dashboard.png?v=2" width="900" alt="Dashboard Preview">
</p>

### Route Planner
<p align="center">
  <img src="images/route-planner.png?v=2" width="900" alt="Route Planner Preview">
</p>

### City Hub Management
<p align="center">
  <img src="images/cities.png?v=2" width="900" alt="Cities Management Preview">
</p>

---

## Tech Stack

### Frontend
- React.js (v19)
- React Router DOM
- TailwindCSS
- Axios

### Backend
- FastAPI
- SQLAlchemy ORM
- Pydantic
- Uvicorn
- Python-Jose & Passlib (JWT / Cryptography)

### Database & Infrastructure
- PostgreSQL (Neon Serverless)
- Vercel (Frontend Hosting)
- Render (Backend Hosting)

---

## System Architecture

```
React Frontend (Vite)
        |
        v  (REST API / JWT Header)
FastAPI Backend (Uvicorn)
        |
        v
SQLAlchemy ORM (User-Scoped Queries)
        |
        v
PostgreSQL Database (Neon Serverless)
        |
        v
Segmented Graph Routing Engine
   |-- Dijkstra's Algorithm (Min-Heap Priority Queue)
   \-- A* Heuristic Algorithm
```

---

## Folder Structure

```
RouteIQ/
|
|-- backend/
|   |-- app/
|   |   |-- api/                # API route controllers (user, city, road, route)
|   |   |-- core/               # Configuration settings
|   |   |-- database/           # DB engine, session lifecycle, and seeders
|   |   |-- models/             # SQLAlchemy models (User, City, Road)
|   |   |-- schemas/            # Pydantic validation schemas
|   |   |-- services/           # Routing engine and workspace seeder
|   |   |-- utils/              # Security and JWT utilities
|   |   \-- main.py             # FastAPI entrypoint and middleware
|   |-- Dockerfile
|   |-- docker-compose.yml
|   \-- requirements.txt
|
\-- frontend/
    |-- src/
    |   |-- components/         # Layout, Navbar, Protected Routes
    |   |-- pages/              # Dashboard, Cities, Roads, RoutePlanner, Login, Register
    |   |-- services/           # Axios client instance with auth interceptors
    |   |-- App.jsx             # React routing setup
    |   \-- main.jsx            # Frontend entrypoint
    |-- package.json
    \-- vite.config.js
```

---

## Route Optimization and Graph Model

The road network is modeled as a **weighted directed/undirected graph** $G = (V, E)$:
- **Vertices ($V$):** Logistics cities and warehouse hubs.
- **Edges ($E$):** Road segments with driving distances as edge weights.

When multi-stop queries are submitted ($S \to W_1 \to W_2 \dots \to D$), the engine partitions the path into consecutive sub-problems, computes the shortest sub-paths, and reconstructs the end-to-end route with segment telemetry and fuel/time savings metrics.

---

## REST API Endpoints

### Authentication

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/register` | Register a new user and auto-seed default workspace |
| POST | `/login` | Authenticate credentials and return JWT bearer token |
| POST | `/login/guest` | Instant single-click guest login with isolated workspace |
| GET | `/me` | Get profile of the current authenticated user |

### City Hubs

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/cities/` | List all city hubs in the user's workspace |
| POST | `/cities/` | Register a new city hub (with optional geocoding) |
| DELETE | `/cities/{id}` | Delete a city hub and cascade-remove associated roads |
| POST | `/cities/reset-to-master` | Restore workspace to official master logistics network |

### Roads

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/roads/` | List all road connections in the user's workspace |
| POST | `/roads/` | Connect two hubs (supports Haversine distance auto-calculation) |
| DELETE | `/roads/{id}` | Remove a road segment from the user's network |

### Route Optimization

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/route/` | Compute shortest path with algorithms and waypoint stops |

---

## Local Development Setup

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# Linux/macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI development server
uvicorn app.main:app --reload --port 8000
```

Backend API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```

Frontend application runs at `http://localhost:5173`.

---

## Author

**Aayush Bhatt**
- GitHub: https://github.com/aayush0012
- LinkedIn: https://www.linkedin.com/in/aayush-bhatt-3657b1314/
