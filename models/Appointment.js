const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 30 // minutes
  },
  type: {
    type: String,
    enum: ['video', 'phone', 'in-person'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  reason: String,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);
