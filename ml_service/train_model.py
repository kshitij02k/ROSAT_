import numpy as np
import joblib
import json
import os
from sklearn.ensemble import RandomForestRegressor

MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# ── Model 1: Duration Predictor ──────────────────────────────────────────────
np.random.seed(42)
n = 200

BASE_DURATION      = 10   # minimum consultation minutes
EMERGENCY_WEIGHT   = 3    # extra minutes per emergency level
AGE_WEIGHT         = 0.1  # extra minutes per year of age
VISIT_WEIGHT       = 2    # extra minutes per previous visit
NOISE_RANGE        = 10   # max random noise in minutes

age             = np.random.randint(18, 81, n)
emergency_level = np.random.randint(1, 6, n)
previous_visits = np.random.randint(0, 6, n)
symptoms_length = np.random.randint(20, 501, n)

duration = (
    BASE_DURATION
    + emergency_level * EMERGENCY_WEIGHT
    + age * AGE_WEIGHT
    + previous_visits * VISIT_WEIGHT
    + np.random.uniform(0, NOISE_RANGE, n)
)

X = np.column_stack([age, emergency_level, previous_visits, symptoms_length])
y = duration

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

joblib.dump(model, os.path.join(MODELS_DIR, 'duration_model.pkl'))

# ── Model 2: Specialization Rules ────────────────────────────────────────────
specialization_rules = {
    "Cardiologist":       ["chest pain", "heart", "palpitation", "cardiac"],
    "Neurologist":        ["headache", "brain", "seizure", "neurological", "migraine", "dizziness"],
    "Dermatologist":      ["skin", "rash", "acne", "eczema", "dermatitis"],
    "Orthopedist":        ["bone", "joint", "fracture", "arthritis", "orthopedic", "back pain"],
    "Gastroenterologist": ["stomach", "abdomen", "digestive", "gastric", "nausea", "vomiting", "diarrhea"],
    "Pulmonologist":      ["lung", "breathing", "cough", "asthma", "respiratory", "pneumonia"],
    "Psychiatrist":       ["mental", "anxiety", "depression", "psychiatric", "stress", "mood"],
}

with open(os.path.join(MODELS_DIR, 'specialization_rules.json'), 'w') as f:
    json.dump(specialization_rules, f, indent=2)

print("Models trained and saved successfully!")
