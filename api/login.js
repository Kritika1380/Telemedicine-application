const db = require('../lib/mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  await db;
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.json({ ok: false, message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ ok: false, message: 'Invalid email or password' });

    if (!user.isActive) return res.json({ ok: false, message: 'Account is deactivated' });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.json({ ok: false, message: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this', { expiresIn: '7d' });

    return res.json({ ok: true, token, role: user.role, name: user.firstName, userId: user._id });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during login' });
  }
};
