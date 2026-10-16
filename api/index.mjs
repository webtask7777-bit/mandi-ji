export default async (req, res) => {
  try {
    const { default: app } = await import('../server/index.js');
    app(req, res);
  } catch (err) {
    // The details go to the function log, never to the client.
    console.error('API failed to start', err);
    res.status(500).json({ error: 'सर्वर अभी उपलब्ध नहीं है' });
  }
};
