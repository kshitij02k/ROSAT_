const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const predictDuration = async (age, symptoms, emergencyLevel, previousVisits) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict-duration`,
      { age, symptoms, emergencyLevel, previousVisits },
      { timeout: 5000 }
    );
    return response.data.predictedDuration || 15;
  } catch (err) {
    console.warn('ML duration prediction failed, using fallback:', err.message);
    return 15;
  }
};

const predictSpecialization = async (symptoms) => {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict-specialization`,
      { symptoms },
      { timeout: 5000 }
    );
    return response.data.specialization || 'General Physician';
  } catch (err) {
    console.warn('ML specialization prediction failed, using fallback:', err.message);
    return 'General Physician';
  }
};

module.exports = { predictDuration, predictSpecialization };
