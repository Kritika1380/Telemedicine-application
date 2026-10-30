const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  symptoms: {
    description: String,
    urgency: {
      type: String,
      enum: ['routine', 'urgent', 'emergency'],
      default: 'routine'
    }
  },
  diagnosis: String,
  prescription: String,
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledAt: Date,
  completedAt: Date,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Consultation', consultationSchema);
