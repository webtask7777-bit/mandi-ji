export default async (req, res) => {
  try {
    const { default: app } = await import('../server/index.js');
    app(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack?.split('\n').slice(0, 5) });
  }
};
