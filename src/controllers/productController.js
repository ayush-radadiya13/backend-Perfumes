const Product = require('../models/Product');
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function listPublic(req, res) {
  try {
    const { category, collection, search, page = 1, limit = 12 } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    if (collection) q.collections = collection;
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { description: rx }];
    }
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(50, parseInt(limit, 10) || 12);
    const lim = Math.min(50, parseInt(limit, 10) || 12);
    const [items, total] = await Promise.all([
      Product.find(q)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Product.countDocuments(q),
    ]);
    res.json({ items, total, page: parseInt(page, 10) || 1, pages: Math.ceil(total / lim) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function getBySlug(req, res) {
  const item = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category')
    .populate('collections');
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

async function listAdmin(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const lim = Math.min(100, parseInt(limit, 10) || 20);
  const [items, total] = await Promise.all([
    Product.find()
      .populate('category', 'name')
      .populate('collections', 'name')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(lim),
    Product.countDocuments(),
  ]);
  res.json({ items, total, page: parseInt(page, 10), pages: Math.ceil(total / lim) });
}

async function getOneAdmin(req, res) {
  const item = await Product.findById(req.params.id)
    .populate('category')
    .populate('collections');
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

async function create(req, res) {
  try {
    const body = req.body;
    if (!body.name || body.price == null || !body.category) {
      return res.status(400).json({ message: 'name, price, category required' });
    }
    const item = await Product.create({
      name: body.name,
      slug: slugify(body.slug || body.name),
      description: body.description || '',
      price: Number(body.price),
      compareAtPrice: body.compareAtPrice != null ? Number(body.compareAtPrice) : null,
      sku: body.sku || '',
      images: Array.isArray(body.images) ? body.images : [],
      category: body.category,
      collections: Array.isArray(body.collections) ? body.collections : [],
      stock: Number(body.stock) || 0,
      volumeMl: body.volumeMl != null ? Number(body.volumeMl) : 50,
      fragranceNotes: body.fragranceNotes || '',
      isActive: body.isActive !== false,
    });
    const populated = await Product.findById(item._id)
      .populate('category')
      .populate('collections');
    res.status(201).json(populated);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Slug already exists' });
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const updates = { ...req.body };
    if (updates.slug) updates.slug = slugify(updates.slug);
    if (updates.name && !req.body.slug) updates.slug = slugify(updates.name);
    ['price', 'compareAtPrice', 'stock', 'volumeMl'].forEach((k) => {
      if (updates[k] != null) updates[k] = Number(updates[k]);
    });
    const item = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('category')
      .populate('collections');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Slug already exists' });
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  const item = await Product.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
}

module.exports = {
  listPublic,
  getBySlug,
  listAdmin,
  getOneAdmin,
  create,
  update,
  remove,
};
