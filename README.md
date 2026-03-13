# 🏥 Telemedicine Queue Optimization System

A production-ready full-stack telemedicine platform with AI-powered queue optimization, real-time updates, and multi-role dashboards.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js (JSX), Plain CSS, React Router, Axios, Socket.io-client, Chart.js |
| **Backend** | Node.js, Express.js, Socket.io |
| **Database** | MongoDB with Mongoose |
| **ML Service** | Python Flask, Scikit-learn (RandomForestRegressor) |
| **Auth** | JWT (JSON Web Tokens) |

## 📁 Project Structure

```
├── backend/                  # Node.js/Express API
│   ├── server.js             # Main entry point
│   ├── models/               # Mongoose schemas
│   ├── controllers/          # Business logic
│   ├── routes/               # API routes
│   ├── services/             # Queue & ML services
│   └── middleware/           # Auth & rate limiting
│
├── frontend/                 # React.js application
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── patient/      # Patient Dashboard, JoinQueue, Appointment, Consultation
│       │   ├── doctor/       # Doctor Dashboard
│       │   └── admin/        # Admin Dashboard
│       ├── components/       # Shared components
│       ├── context/          # Auth context
│       └── services/         # API & Socket.io
│
└── ml_service/               # Python Flask ML API
    ├── app.py                # Flask app
    ├── train_model.py        # Model training script
    └── models/               # Trained model files
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Python 3.9+

### 1. ML Service

```bash
cd ml_service
pip install -r requirements.txt
python train_model.py   # Train the models
python app.py           # Start on port 5001
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # Edit .env with your MongoDB URI and JWT secret
node server.js          # Start on port 5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev             # Start on port 3000
```

Open [http://localhost:3000](http://localhost:3000)

## 👥 Roles & Features

### 🧑‍⚕️ Patient
- **Join Live Queue**: Multi-step form with ML-predicted specialization
- **Book Appointments**: Future date/slot selection with doctor availability
- **Live Queue Status**: Real-time position, wait time, assigned doctor
- **Consultation**: Video call or chat interface with timer

### 👨‍⚕️ Doctor
- **Status Toggle**: Active/Inactive switch (prominent, real-time)
- **Queue Management**: Priority-sorted queue with emergency color coding
- **Session Controls**: Start/End session buttons with ML timer
- **Auto-reassignment**: Patients reassigned if doctor goes offline

### 🔧 Admin
- **Global Queue Monitor**: All live queues across all doctors
- **Analytics Dashboard**: Chart.js charts (Bar, Line, Pie)
- **FIFO vs Optimized Comparison**: Queue performance metrics
- **Simulation Engine**: Test queue parameters

## 🧠 Queue Optimization Algorithm

| Problem | Solution |
|---------|---------|
| Long wait times | ML predicts consultation duration (RandomForestRegressor) |
| Emergency delays | Priority Score = (EmergencyLevel × 5) × WaitingTime |
| Starvation | Aging: +1 priority every 5 minutes of waiting |
| Fake emergencies | Warning modal for level 4-5 selection |
| Exceeded predictions | Real-time socket notification to next patient |
| Doctor inaction | 3-min timer → admin alert → auto-reassign |
| Doctor goes offline | Immediate patient reassignment to same specialization |

## 🔌 Environment Variables

Create `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/telemedicine
JWT_SECRET=your_super_secret_key
ML_SERVICE_URL=http://localhost:5001
```

## 📊 API Endpoints

| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/patient/join-queue` | Patient |
| GET | `/api/patient/my-queue` | Patient |
| GET | `/api/doctor/queue` | Doctor |
| POST | `/api/doctor/toggle-status` | Doctor |
| POST | `/api/doctor/start-session/:id` | Doctor |
| POST | `/api/doctor/end-session/:id` | Doctor |
| GET | `/api/admin/global-queues` | Admin |
| GET | `/api/admin/analytics` | Admin |
| POST | `/api/admin/simulate` | Admin |

## 🔄 Real-Time Events (Socket.io)

| Event | Direction | Description |
|-------|-----------|-------------|
| `queue:updated` | Server → Doctor | Queue reordered |
| `patient:wait-updated` | Server → Patient | Estimated wait changed |
| `notification:alert` | Server → All | General notification |
| `admin:alert` | Server → Admin | Doctor inaction / reassignment |
| `doctor:reassigned` | Server → Patient | Patient reassigned to new doctor |
