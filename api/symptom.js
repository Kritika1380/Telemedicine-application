const db = require('../lib/mongoose');
const Consultation = require('../models/Consultation');
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

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const auth = authenticateToken(req);
    if (!auth.ok) {
      return res.status(401).json({ ok: false, message: auth.message });
    }

    const userId = auth.user.userId;
    const payload = req.body || {};

    console.log('Symptom submission:', payload);

    // Create new consultation
    const consultation = new Consultation({
      patient: userId,
      symptoms: {
        description: payload.description || payload.desc,
        urgency: payload.urgency || 'routine'
      },
      status: 'pending'
    });

    await consultation.save();

    return res.json({
      ok: true,
      consultId: consultation._id,
      message: 'Consultation request submitted successfully'
    });
  } catch (error) {
    console.error('Symptom submission error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error submitting consultation request'
    });
  }
};
