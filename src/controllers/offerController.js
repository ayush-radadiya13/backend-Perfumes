const Offer = require('../models/Offer');

async function list(req, res) {
  try {
    const { page, limit } = req.query;
    const hasPage = page !== undefined && page !== '' && String(page).trim() !== '';
    if (hasPage) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (p - 1) * lim;
      const [items, total] = await Promise.all([
        Offer.find()
          .populate('category', 'name')
          .populate('products', 'name slug')
          .populate('collections', 'name')
          .sort({ endDate: -1 })
          .skip(skip)
          .limit(lim)
          .lean(),
        Offer.countDocuments(),
      ]);
      return res.json({
        items,
        total,
        page: p,
        pages: Math.max(1, Math.ceil(total / lim)),
      });
    }
    const items = await Offer.find()
      .populate('category', 'name')
      .populate('products', 'name slug')
      .populate('collections', 'name')
      .sort({ endDate: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function getOne(req, res) {
  const item = await Offer.findById(req.params.id)
    .populate('category')
    .populate('products')
    .populate('collections');
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

async function create(req, res) {
  try {
    const b = req.body;
    if (!b.title || b.discountPercent == null || !b.startDate || !b.endDate) {
      return res.status(400).json({ message: 'title, discountPercent, startDate, endDate required' });
    }
    const item = await Offer.create({
      title: b.title,
      description: b.description || '',
      discountPercent: Number(b.discountPercent),
      appliesTo: b.appliesTo || 'all',
      category: b.category || null,
      products: Array.isArray(b.products) ? b.products : [],
      collections: Array.isArray(b.collections) ? b.collections : [],
      startDate: new Date(b.startDate),
      endDate: new Date(b.endDate),
      isActive: b.isActive !== false,
      code: (b.code || '').toUpperCase(),
    });
    const populated = await Offer.findById(item._id)
      .populate('category')
      .populate('products')
      .populate('collections');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const b = req.body;
    const updates = { ...b };
    if (b.discountPercent != null) updates.discountPercent = Number(b.discountPercent);
    if (b.startDate) updates.startDate = new Date(b.startDate);
    if (b.endDate) updates.endDate = new Date(b.endDate);
    if (b.code) updates.code = b.code.toUpperCase();
    const item = await Offer.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('category')
      .populate('products')
      .populate('collections');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  const item = await Offer.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
}

module.exports = { list, getOne, create, update, remove };
