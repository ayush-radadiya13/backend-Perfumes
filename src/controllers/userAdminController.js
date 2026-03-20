const User = require('../models/User');

/** Paginated list of storefront User accounts (no password fields). */
async function list(req, res) {
  try {
    const { page = 1, limit = 30, role } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = Math.min(100, parseInt(limit, 10) || 30);
    const q = {};
    if (role === 'user' || role === 'admin') q.role = role;
    const [items, total] = await Promise.all([
      User.find(q)
        .select('name email role createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      User.countDocuments(q),
    ]);
    res.json({
      items,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / lim) || 1,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { list };
