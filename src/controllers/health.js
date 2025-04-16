export const healthController = {
  check: (req, res) => {
    res.json({ status: 'ok' });
  },

  details: (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  }
};