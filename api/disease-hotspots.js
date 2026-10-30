module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ ok: false, message: 'Latitude and longitude required' });
    }

    // In production, this would query a real disease database
    // For demo, return mock data
    const hotspots = [
      {
        disease: 'Influenza',
        cases: 47,
        risk: 'high',
        lat: parseFloat(lat) + 0.02,
        lng: parseFloat(lng) - 0.01,
        distance: '2.3 km',
        direction: 'North',
        trend: 'increasing'
      },
      {
        disease: 'Flu Outbreak',
        cases: 32,
        risk: 'high',
        lat: parseFloat(lat) + 0.015,
        lng: parseFloat(lng) + 0.015,
        distance: '1.9 km',
        direction: 'Northeast',
        trend: 'stable'
      },
      {
        disease: 'Dengue',
        cases: 18,
        risk: 'medium',
        lat: parseFloat(lat) - 0.025,
        lng: parseFloat(lng) + 0.01,
        distance: '3.5 km',
        direction: 'South',
        trend: 'increasing'
      },
      {
        disease: 'COVID-19 Variant',
        cases: 12,
        risk: 'medium',
        lat: parseFloat(lat) + 0.01,
        lng: parseFloat(lng) + 0.03,
        distance: '4.1 km',
        direction: 'East',
        trend: 'decreasing'
      },
      {
        disease: 'Common Cold',
        cases: 8,
        risk: 'low',
        lat: parseFloat(lat) - 0.02,
        lng: parseFloat(lng) - 0.02,
        distance: '5.8 km',
        direction: 'Northwest',
        trend: 'stable'
      }
    ];

    return res.json({ ok: true, hotspots, userLocation: { lat, lng } });
  } catch (error) {
    console.error('Disease hotspots error:', error);
    return res.status(500).json({ ok: false, message: 'Error fetching disease hotspots' });
  }
};
