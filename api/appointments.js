const db = require('../lib/mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { ok: false, user: null, message: 'Access token required' };
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this');
    return { ok: true, user };
  } catch (err) {
    return { ok: false, user: null, message: 'Invalid or expired token' };
  }
};

module.exports = async (req, res) => {
  await db;

  // Authenticate user
  const auth = authenticateToken(req);
  if (!auth.ok) {
    return res.status(401).json({ ok: false, message: auth.message });
  }

  const userId = auth.user.userId;
  const role = auth.user.role;

  try {
    // GET: Fetch appointments
    if (req.method === 'GET') {
      let query = {};
      if (role === 'patient') {
        query.patient = userId;
      } else if (role === 'doctor') {
        query.doctor = userId;
      }

      const appointments = await Appointment.find(query)
        .populate('patient', 'firstName lastName email phone')
        .populate('doctor', 'firstName lastName email')
        .sort({ scheduledDate: 1 });

      // Format appointments for frontend
      const formattedAppointments = appointments.map((appt) => ({
        _id: appt._id,
        doctorName: appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : 'Doctor',
        patientName: appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : 'Patient',
        scheduledDate: appt.scheduledDate,
        type: appt.type,
        status: appt.status,
        reason: appt.reason
      }));

      return res.json({ ok: true, appointments: formattedAppointments });
    }

    // POST: Book new appointment
    if (req.method === 'POST') {
      const { doctor, type, date, time, reason } = req.body;

      if (!doctor || !type || !date || !time || !reason) {
        return res.json({ ok: false, message: 'All fields are required' });
      }

      // Combine date and time
      const scheduledDate = new Date(`${date}T${time}`);

      // For demo, assign a random doctor from database or use mock ID
      const doctors = await User.find({ role: 'doctor' }).limit(1);
      const doctorId = doctors.length > 0 ? doctors[0]._id : userId; // Fallback to self if no doctors

      const appointment = new Appointment({
        patient: userId,
        doctor: doctorId,
        scheduledDate,
        type,
        status: 'scheduled',
        reason
      });

      await appointment.save();

      return res.json({
        ok: true,
        message: 'Appointment booked successfully',
        appointmentId: appointment._id
      });
    }

    // DELETE: Cancel appointment
    if (req.method === 'DELETE') {
      const appointmentId = req.query.id;

      if (!appointmentId) {
        return res.json({ ok: false, message: 'Appointment ID required' });
      }

      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        return res.json({ ok: false, message: 'Appointment not found' });
      }

      // Check if user is authorized to cancel
      if (appointment.patient.toString() !== userId && appointment.doctor.toString() !== userId) {
        return res.status(403).json({ ok: false, message: 'Not authorized to cancel this appointment' });
      }

      appointment.status = 'cancelled';
      await appointment.save();

      return res.json({ ok: true, message: 'Appointment cancelled successfully' });
    }

    // PATCH: Update appointment status
    if (req.method === 'PATCH') {
      const appointmentId = req.query.id;
      const { status } = req.body;

      if (!appointmentId) {
        return res.json({ ok: false, message: 'Appointment ID required' });
      }

      const appointment = await Appointment.findById(appointmentId);

      if (!appointment) {
        return res.json({ ok: false, message: 'Appointment not found' });
      }

      appointment.status = status;
      await appointment.save();

      return res.json({ ok: true, message: 'Appointment updated successfully' });
    }

    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Appointments error:', error);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
};
