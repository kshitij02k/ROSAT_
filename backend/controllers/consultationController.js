const Consultation = require('../models/Consultation');

const getConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

    const userId = req.user.id;
    const isOwner =
      consultation.patientId._id.toString() === userId ||
      (consultation.doctorId && consultation.doctorId._id.toString() === userId) ||
      req.user.role === 'admin';

    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to view this consultation' });
    }

    res.json({ consultation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateConsultationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['waiting', 'in-progress', 'completed', 'missed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

    res.json({ consultation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getConsultation, updateConsultationStatus };
