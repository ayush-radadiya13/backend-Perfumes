const Collection = require('../models/Collection');
const Product = require('../models/Product');
const { uploadBufferToCloudinary, publicUrlForLocalFile } = require('../middleware/upload');

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

function parseBool(v, defaultVal) {
  if (v === undefined || v === null || v === '') return defaultVal;
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return defaultVal;
}

async function fileToImageUrl(file) {
  if (!file) return null;
  if (process.env.USE_CLOUDINARY === 'true') {
    return uploadBufferToCloudinary(file.buffer, 'collections');
  }
  return publicUrlForLocalFile(file.filename);
}

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
        Collection.find(q).sort({ name: 1 }).skip(skip).limit(lim).lean(),
        Collection.countDocuments(q),
      ]);
      return res.json({
        items,
        total,
        page: p,
        pages: Math.max(1, Math.ceil(total / lim)),
      });
    }
    const items = await Collection.find(q).sort({ name: 1 }).lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

/** Public storefront: hero image from cover or first product; previewImages for gallery */
async function listStorefront(req, res) {
  const { active } = req.query;
  const q = {};
  if (active === 'true') q.isActive = true;
  const items = await Collection.find(q).sort({ name: 1 }).lean();
  const ids = items.map((c) => c._id);
  if (!ids.length) return res.json([]);

  const products = await Product.find({
    isActive: true,
    collections: { $in: ids },
    images: { $exists: true, $not: { $size: 0 } },
  })
    .select('collections images')
    .sort({ createdAt: -1 })
    .lean();

  const previewByCollection = new Map();
  for (const p of products) {
    for (const colId of p.collections || []) {
      const key = String(colId);
      let arr = previewByCollection.get(key);
      if (!arr) {
        arr = [];
        previewByCollection.set(key, arr);
      }
      if (arr.length >= 8) continue;
      for (const im of p.images || []) {
        if (!im || arr.length >= 8) break;
        if (!arr.includes(im)) arr.push(im);
      }
    }
  }

  const enriched = items.map((c) => {
    const previews = previewByCollection.get(String(c._id)) || [];
    const explicit = (c.image && String(c.image).trim()) || '';
    const hero = explicit || previews[0] || '';
    return {
      ...c,
      image: hero,
      previewImages: previews.slice(0, 4),
    };
  });

  res.json(enriched);
}

async function getOne(req, res) {
  const item = await Collection.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
}

async function create(req, res) {
  try {
    const name = req.body.name;
    if (!name) return res.status(400).json({ message: 'Name required' });

    let image = typeof req.body.image === 'string' ? req.body.image : '';
    if (req.file) {
      const url = await fileToImageUrl(req.file);
      if (url) image = url;
    }

    const item = await Collection.create({
      name,
      slug: slugify(req.body.slug || name),
      description: req.body.description || '',
      image: image || '',
      featured: parseBool(req.body.featured, false),
      isActive: parseBool(req.body.isActive, true),
    });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Slug already exists' });
    res.status(500).json({ message: e.message });
  }
}

async function update(req, res) {
  try {
    const updates = {};

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description || '';

    if (req.body.slug !== undefined && String(req.body.slug).trim()) {
      updates.slug = slugify(req.body.slug);
    } else if (req.body.name !== undefined) {
      updates.slug = slugify(req.body.name);
    }

    if (req.file) {
      const url = await fileToImageUrl(req.file);
      if (url) updates.image = url;
    } else if (Object.prototype.hasOwnProperty.call(req.body, 'image')) {
      updates.image = typeof req.body.image === 'string' ? req.body.image : '';
    }

    if (req.body.featured !== undefined) updates.featured = parseBool(req.body.featured, false);
    if (req.body.isActive !== undefined) updates.isActive = parseBool(req.body.isActive, true);

    const item = await Collection.findByIdAndUpdate(req.params.id, updates, {
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
  const item = await Collection.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true });
}

module.exports = { list, listStorefront, getOne, create, update, remove };
