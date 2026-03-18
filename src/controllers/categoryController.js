const Category = require('../models/Category');
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function list(req, res) {
  try {
    const { active, page, limit } = req.query;
    const q = {};
    if (active === 'true') q.isActive = true;

    const hasPage = page !== undefined && page !== '' && String(page).trim() !== '';
    if (hasPage) {
      const p = Math.max(1, parseInt(page, 10) || 1);
      const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const skip = (p - 1) * lim;
      const [items, total] = await Promise.all([
        Category.find(q).sort({ name: 1 }).skip(skip).limit(lim).lean(),
        Category.countDocuments(q),
      ]);
      return res.json({
        items,
        total,
        page: p,
        pages: Math.max(1, Math.ceil(total / lim)),
      });
    }
    const items = await Category.find(q).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function getOne(req, res) {
  const item = await Category.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

async function create(req, res) {
  try {
    const { name, description, slug, image, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const finalSlug = slugify(slug || name);
    const item = await Category.create({
      name,
      slug: finalSlug,
      description: description || '',
      image: image || '',
      isActive: isActive !== false,
    });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Slug already exists' });
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const updates = { ...req.body };
    if (updates.name && !updates.slug) updates.slug = slugify(updates.name);
    if (updates.slug) updates.slug = slugify(updates.slug);
    const item = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Slug already exists' });
    res.status(500).json({ message: e.message });
  }
}

async function remove(req, res) {
  const item = await Category.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
}

module.exports = { list, getOne, create, update, remove };
