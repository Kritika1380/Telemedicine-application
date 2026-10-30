const db = require('../lib/mongoose');
const User = require('../models/User');

module.exports = async (req, res) => {
  await db;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  try {
    const { firstName, lastName, email, password, phone, dob, gender, role } = req.body || {};

    if (!firstName || !lastName || !email || !password) {
      return res.json({ ok: false, message: 'Please fill all required fields' });
    }

    if (password.length < 6) {
      return res.json({ ok: false, message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return res.json({ ok: false, message: 'Email already registered' });

    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      phone,
      dob: dob ? new Date(dob) : undefined,
      gender,
      role: role || 'patient'
    });

    await newUser.save();

    return res.json({ ok: true, message: 'Registration successful', userId: newUser._id });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) return res.json({ ok: false, message: 'Email already registered' });
    return res.status(500).json({ ok: false, message: 'Server error during registration' });
  }
};
