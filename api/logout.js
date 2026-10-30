module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    // Logout is handled client-side by removing the token
    // Server-side can optionally blacklist tokens here
    return res.json({ ok: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ ok: false, message: 'Server error during logout' });
  }
};
