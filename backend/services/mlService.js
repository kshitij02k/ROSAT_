const axios = require('axios');

const SYMPTOM_SPECIALIZATION_MAP = {
  fever: 'physician',
  cold: 'physician',
  flu: 'physician',
  cough: 'physician',
  headache: 'neurologist',
  migraine: 'neurologist',
  'eye pain': 'ophthalmologist',
  vision: 'ophthalmologist',
  'heart pain': 'cardiologist',
  'chest pain': 'cardiologist',
  palpitations: 'cardiologist',
  'skin rash': 'dermatologist',
  acne: 'dermatologist',
  'back pain': 'orthopedist',
  fracture: 'orthopedist',
  joint: 'orthopedist',
  anxiety: 'psychiatrist',
  depression: 'psychiatrist',
  dental: 'dentist',
  tooth: 'dentist',
  stomach: 'gastroenterologist',
  abdomen: 'gastroenterologist',
  diarrhea: 'gastroenterologist'
};

const detectSpecialization = (symptoms) => {
  if (!symptoms) return 'physician';
  const lower = symptoms.toLowerCase();
  for (const [keyword, spec] of Object.entries(SYMPTOM_SPECIALIZATION_MAP)) {
    if (lower.includes(keyword)) return spec;
  }
  return 'physician';
};

const predictDuration = async (age, symptom, emergencyLevel, previousVisits = 0) => {
  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    const response = await axios.post(`${mlUrl}/predict-duration`, {
      age,
      symptom,
      emergency: emergencyLevel,
      previousVisits
    }, { timeout: 5000 });
    return response.data.predictedDuration || 10;
  } catch (error) {
    // Fallback: simple rule-based prediction
    let base = 8;
    if (emergencyLevel >= 4) base = 15;
    else if (emergencyLevel === 3) base = 12;
    else if (emergencyLevel === 2) base = 10;
    if (age > 60) base += 3;
    if (previousVisits > 2) base += 2;
    return base;
  }
};

module.exports = { detectSpecialization, predictDuration };
