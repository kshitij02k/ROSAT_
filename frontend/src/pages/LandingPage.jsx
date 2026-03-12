import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div className="landing-logo">
          <div className="logo-icon">🏥</div>
          <h1>TeleMed QOS</h1>
        </div>
        <nav className="landing-nav-links">
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            🤖 AI-Powered Queue Optimization
          </div>
          <h1>Smarter Telemedicine Queue Management</h1>
          <p>
            Reduce wait times by up to 40% with ML-powered consultation prediction,
            intelligent priority scheduling, and real-time queue updates.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn btn-white btn-lg">
              Start Free Today
            </Link>
            <Link to="/login" className="btn btn-outline-white btn-lg">
              Sign In →
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-metric">
            <div className="metric-icon">⚡</div>
            <div>
              <h3>40%</h3>
              <p>Reduction in Wait Time</p>
            </div>
          </div>
          <div className="hero-metric">
            <div className="metric-icon">🚨</div>
            <div>
              <h3>99%</h3>
              <p>Emergency Case Priority</p>
            </div>
          </div>
          <div className="hero-metric">
            <div className="metric-icon">🤖</div>
            <div>
              <h3>ML</h3>
              <p>Duration Prediction</p>
            </div>
          </div>
          <div className="hero-metric">
            <div className="metric-icon">📡</div>
            <div>
              <h3>Live</h3>
              <p>Real-time Updates</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>Everything You Need for Optimal Care</h2>
        <p>A complete platform built for patients, doctors, and administrators</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>ML Duration Prediction</h3>
            <p>RandomForestRegressor model predicts consultation duration based on age, symptoms, emergency level, and visit history.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚨</div>
            <h3>Priority Scheduling</h3>
            <p>Emergency cases get immediate priority. The aging algorithm prevents starvation of normal patients over time.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚖️</div>
            <h3>Load Balancing</h3>
            <p>Intelligent doctor assignment based on specialization matching and current workload distribution.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📡</div>
            <h3>Real-time Updates</h3>
            <p>Socket.io powered live queue updates. Patients see position changes and estimated wait times instantly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Analytics Dashboard</h3>
            <p>Compare FIFO vs optimized queue performance with interactive charts and metrics.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Simulation Engine</h3>
            <p>Test different queue configurations and see predicted improvements before going live.</p>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <h2>Ready to Optimize Your Telemedicine Queue?</h2>
        <p>Join thousands of healthcare providers improving patient outcomes with smart queue management.</p>
        <div className="landing-cta-buttons">
          <Link to="/register?role=patient" className="btn btn-white btn-lg">
            Register as Patient
          </Link>
          <Link to="/register?role=doctor" className="btn btn-outline-white btn-lg">
            Register as Doctor
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2024 Telemedicine Queue Optimization System. Built with React, Node.js, MongoDB & Python Flask ML.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
