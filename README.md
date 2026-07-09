# 🚗 Go Route

A full-stack route optimization platform that enables users to manage city networks, create road connections, and compute the shortest path between cities using **Dijkstra's Algorithm**.

---

## 🌐 Live Demo

**Live:** https://backend-proj-blue.vercel.app/

## 💻 Source Code

**GitHub:** https://github.com/aayush0012/backend_proj

---

# ✨ Features

- 🔐 JWT Authentication
- 👤 User Registration & Login
- 🏙️ City Management (CRUD)
- 🛣️ Road Management (CRUD)
- 📍 Shortest Path Computation using Dijkstra's Algorithm
- ⚡ FastAPI REST APIs
- 💾 PostgreSQL Database
- 🌍 Fully Deployed Application

---

# 📸 Application Screenshots

## Dashboard

<p align="center">
  <img src="images/dashboard.png" width="900">
</p>

---

## Route Planner

<p align="center">
  <img src="images/route-planner.png" width="900">
</p>

---

# 🛠 Tech Stack

### Frontend

- React.js
- React Router
- Axios
- CSS

### Backend

- FastAPI
- SQLAlchemy
- JWT Authentication
- Pydantic

### Database

- PostgreSQL
- Neon PostgreSQL

### Deployment

- Render
- Vercel

---

# 🏗️ Project Architecture

```
React Frontend
        │
        ▼
     Axios API
        │
        ▼
 FastAPI Backend
        │
        ▼
 SQLAlchemy ORM
        │
        ▼
 PostgreSQL Database
        │
        ▼
 Graph Construction
        │
        ▼
 Dijkstra's Algorithm
```

---

# 📂 Folder Structure

```
backend/
│
├── app/
│   ├── api/
│   ├── database/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── Dockerfile
└── requirements.txt


frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── App.jsx
│
├── package.json
└── vite.config.js
```

---

# 🔐 Authentication

The application uses **JWT (JSON Web Tokens)** for secure authentication.

Authentication flow:

- Register User
- Password Hashing
- Login
- JWT Token Generation
- Protected API Routes

---

# 🛣️ Route Optimization

Go Route models the transportation network as a **weighted graph**.

- Cities → Vertices
- Roads → Weighted Edges

The shortest route is computed using **Dijkstra's Algorithm**, ensuring the minimum travel distance between two connected cities.

---

# 📡 REST API Endpoints

## Authentication

| Method | Endpoint |
|---------|----------|
| POST | `/register` |
| POST | `/login` |

---

## Cities

| Method | Endpoint |
|---------|----------|
| GET | `/cities/` |
| POST | `/cities/` |
| DELETE | `/cities/{id}` |

---

## Roads

| Method | Endpoint |
|---------|----------|
| GET | `/roads/` |
| POST | `/roads/` |
| DELETE | `/roads/{id}` |

---

## Route

| Method | Endpoint |
|---------|----------|
| POST | `/route/` |

---

# 🚀 Running Locally

## Backend

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Runs on:

```
http://localhost:8000
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Runs on:

```
http://localhost:5173
```

---

# 📌 Future Enhancements

- Minimum Stops Routing (BFS)
- Traffic-Based Route Optimization
- Road Closure Support
- Multiple Route Suggestions
- Interactive Maps
- Route History

---

# 👨‍💻 Author

**Aayush Bhatt**

GitHub: https://github.com/aayush0012

LinkedIn: https://www.linkedin.com/in/aayush-bhatt-3657b1314/

---
