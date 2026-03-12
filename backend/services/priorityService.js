// Priority score calculation with aging algorithm
const calculatePriority = (emergencyLevel, waitingTimeMinutes, previousScore = 0) => {
  // Base priority: emergency level * 5
  let priority = emergencyLevel * 5;
  // Add waiting time factor
  priority += waitingTimeMinutes * 0.1;
  // Aging: every 5 minutes waiting, score increases by 1
  priority += Math.floor(waitingTimeMinutes / 5);
  return Math.round(priority * 100) / 100;
};

const getWaitingTimeMinutes = (arrivalTime) => {
  const now = new Date();
  const diff = now - new Date(arrivalTime);
  return Math.floor(diff / (1000 * 60));
};

module.exports = { calculatePriority, getWaitingTimeMinutes };
