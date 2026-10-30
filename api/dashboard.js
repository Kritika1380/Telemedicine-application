const db = require('../lib/mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

function authenticateToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch (err) {
    return null;
  }
}

module.exports = async (req, res) => {
  await db;
  const userPayload = authenticateToken(req);
  if (!userPayload) return res.status(401).json({ ok: false, message: 'Access token required or invalid' });

  try {
    const userId = userPayload.userId;
    const role = userPayload.role;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: 'User not found' });

    if (role === 'doctor') {
      const pendingConsultations = await Consultation.find({ doctor: userId, status: 'pending' }).limit(5).populate('patient', 'firstName lastName');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayConsults = await Consultation.countDocuments({ doctor: userId, status: 'completed', completedAt: { $gte: todayStart } });
      const scheduledAppointments = await Appointment.countDocuments({ doctor: userId, status: 'scheduled', scheduledDate: { $gte: new Date() } });
      const mainHtml = '<div style="padding:1rem">Doctor dashboard (serverless)</div>';
      return res.json({ ok: true, role: 'doctor', stats: [ { icon: 'fas fa-users', value: pendingConsultations.length, label: 'Patients Waiting' }, { icon: 'fas fa-check-circle', value: todayConsults, label: "Today's Consults" }, { icon: 'fas fa-clock', value: scheduledAppointments, label: 'Scheduled' }, { icon: 'fas fa-star', value: '4.8', label: 'Rating' } ], mainHtml });
    }

    if (role === 'admin') {
      const totalPatients = await User.countDocuments({ role: 'patient' });
      const totalDoctors = await User.countDocuments({ role: 'doctor' });
      const totalConsultations = await Consultation.countDocuments();
      const mainHtml = '<div style="padding:1rem">Admin dashboard (serverless)</div>';
      return res.json({ ok: true, role: 'admin', stats: [ { icon: 'fas fa-users', value: totalPatients, label: 'Total Patients' }, { icon: 'fas fa-user-md', value: totalDoctors, label: 'Active Doctors' }, { icon: 'fas fa-video', value: totalConsultations, label: 'Total Consultations' } ], mainHtml });
    }

    // Patient
    const upcomingAppointments = await Appointment.find({ patient: userId, status: 'scheduled', scheduledDate: { $gte: new Date() } }).limit(5);
    const mainHtml = '<div style="padding:1rem">Patient dashboard (serverless)</div>';
    return res.json({ ok: true, role: 'patient', stats: [ { icon: 'fas fa-calendar', value: upcomingAppointments.length, label: 'Upcoming' } ], mainHtml });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
