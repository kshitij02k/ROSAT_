# Telemedicine Queue Optimization System

A **complete full-stack production-ready web application** for simulating and optimizing telemedicine consultation queues using machine learning prediction, priority scheduling, fairness algorithms, and real-time updates.

---

## System Architecture

```
Frontend (React.js + Plain CSS)
       ↓
Node.js API (Queue Optimization Engine)
       ↓
MongoDB Database
       ↓
ML Prediction Service (Python Flask)
       ↓
Socket.io Real-Time Updates
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (JSX), Plain CSS, React Router v6, Axios, Socket.io-client |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| ML Service | Python Flask, Scikit-learn (RandomForestRegressor) |
| Real-Time | Socket.io |

---

## Quick Start

### 1. Prerequisites

- Node.js v18+
- Python 3.8+
- MongoDB (local or Atlas)

### 2. ML Service (Python Flask)

```bash
cd ml-service
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5001
```

### 3. Backend (Node.js)

```bash
cd backend
npm install
# Copy the example env file and adjust if needed
cp .env.example .env
# Seed demo accounts (optional)
node seed.js
node server.js
# Runs on http://localhost:5000
```

### 4. Frontend (React)

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Demo Accounts

After running `node seed.js` in the backend directory:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@telemed.com | admin123 |
| Doctor | doctor@telemed.com | doctor123 |
| Doctor 2 | doctor2@telemed.com | doctor123 |
| Patient | patient@telemed.com | patient123 |

---

## Features

### Queue Optimization Problems & Solutions

| Problem | Solution |
|---------|----------|
| Long waiting times | ML prediction using RandomForestRegressor |
| Emergency delays | Priority scoring: `emergencyLevel × 5 + waitTime × 0.1` |
| Starvation of normal patients | Aging algorithm: `+1 score per 5 min waiting` |
| Consultation time overruns | Dynamic queue recalculation |
| Wrong doctor assignment | Symptom-to-specialization mapping |
| Doctor overload | Load balancing: assign to doctor with shortest queue |
| Patient no-show | Auto-remove after 30 minutes |
| Doctor offline | Reassign to available same-specialization doctor |

### ML Model

- **Algorithm**: RandomForestRegressor
- **Features**: age, symptom (encoded), emergency level, previous visits
- **Target**: consultation duration (minutes)
- **Fallback**: rule-based prediction when ML service unavailable

### Real-Time Events (Socket.io)

- `patientJoined` - New patient joins queue
- `queueUpdated` - Priority scores/positions recalculated
- `consultationStarted` - Doctor starts consultation
- `consultationEnded` - Consultation complete, queue recalculates
- `doctorAssigned` - Doctor assigned to patient

---

## Project Structure

```
├── frontend/              # React.js frontend
│   ├── src/
│   │   ├── App.jsx       # Main router
│   │   ├── components/   # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── QueueCard.jsx
│   │   │   └── DoctorCard.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── patient/  # Patient dashboard, queue, history
│   │   │   ├── doctor/   # Doctor dashboard, consultation, queue
│   │   │   └── admin/    # Admin dashboard, monitor, analytics
│   │   ├── services/
│   │   │   ├── api.js    # Axios API client
│   │   │   └── socket.js # Socket.io client
│   │   └── styles/
│   │       └── global.css # Plain CSS with responsive design
│
├── backend/               # Node.js backend
│   ├── server.js          # Express + Socket.io server
│   ├── config/db.js       # MongoDB connection
│   ├── models/            # Mongoose schemas
│   ├── controllers/       # Route handlers
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   │   ├── queueService.js    # Queue management + simulation
│   │   ├── priorityService.js # Priority scoring + aging
│   │   └── mlService.js       # ML API client + fallback
│   └── middleware/        # Auth middleware (JWT)
│
└── ml-service/            # Python Flask ML API
    ├── app.py             # Flask endpoints
    └── requirements.txt
```

---

## API Endpoints

### Auth
- `POST /api/auth/register` — Register (patient/doctor)
- `POST /api/auth/login` — Login
- `GET /api/auth/profile` — Get profile (JWT protected)

### Patient
- `POST /api/patient/join-queue` — Join queue (ML prediction + doctor assignment)
- `GET /api/patient/queue-status` — Get queue position + wait time
- `GET /api/patient/history` — Consultation history
- `POST /api/patient/leave-queue` — Leave queue

### Doctor
- `GET /api/doctor/profile` — Doctor profile + stats
- `GET /api/doctor/queue` — Priority-sorted queue
- `GET /api/doctor/current-patient` — Current active patient
- `POST /api/doctor/start-consultation` — Start consultation
- `POST /api/doctor/end-consultation` — End consultation
- `GET /api/doctor/history` — Consultation history
- `PUT /api/doctor/availability` — Update availability

### Admin
- `GET /api/admin/dashboard` — System stats
- `GET /api/admin/queue-monitor` — Full live queue
- `GET /api/admin/doctors` — All doctors
- `PUT /api/admin/doctors/:id` — Update doctor
- `GET /api/admin/analytics` — 7-day analytics
- `POST /api/admin/simulate` — Run FIFO vs Optimized simulation

### ML Service
- `POST /predict-duration` — Predict consultation duration
- `GET /health` — Service health check

---

## Responsive Breakpoints

| Device | Breakpoint |
|--------|-----------|
| Mobile | ≤ 600px (sidebar collapses, forms stack, tables scroll) |
| Tablet | 601px – 1024px |
| Desktop | > 1024px |
