const Offer = require('../models/Offer');

function computeStorefrontPricing(o) {
  const orig = o.originalPrice != null ? Number(o.originalPrice) : NaN;
  const kind = o.discountKind || 'percent';
  if (!Number.isFinite(orig) || orig <= 0) {
    const pct = Number(o.discountPercent) || 0;
    return {
      originalPrice: null,
      finalPrice: null,
      discountBadge: pct > 0 ? `${pct}% OFF` : null,
    };
  }
  if (kind === 'fixed' && o.salePrice != null && Number.isFinite(Number(o.salePrice))) {
    const sp = Math.min(Number(o.salePrice), orig);
    const pctOff = Math.round(((orig - sp) / orig) * 100);
    return {
      originalPrice: orig,
      finalPrice: Math.round(sp * 100) / 100,
      discountBadge: pctOff > 0 ? `${pctOff}% OFF` : 'SPECIAL',
    };
  }
  const pct = Math.min(100, Math.max(0, Number(o.discountPercent) || 0));
  const final = Math.round(orig * (100 - pct)) / 100;
  return {
    originalPrice: orig,
    finalPrice: final,
    discountBadge: pct > 0 ? `${pct}% OFF` : null,
  };
}

async function listPublic(req, res) {
  try {
    const now = new Date();
    const items = await Offer.find({
      isActive: true,
      showOnStorefront: { $ne: false },
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ isFeatured: -1, createdAt: -1 })
      .select(
        'title description image originalPrice discountKind salePrice discountPercent isFeatured startDate endDate'
      )
      .lean();

    const offers = items.map((o) => {
      const pricing = computeStorefrontPricing(o);
      return {
        _id: o._id,
        title: o.title,
        description: o.description,
        image: o.image || '',
        isFeatured: !!o.isFeatured,
        discountKind: o.discountKind || 'percent',
        ...pricing,
      };
    });

    res.json({ offers });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

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
    if (!b.title || !b.startDate || !b.endDate) {
      return res.status(400).json({ message: 'title, startDate, endDate required' });
    }
    const kind = b.discountKind === 'fixed' ? 'fixed' : 'percent';
    if (kind === 'percent' && b.discountPercent == null) {
      return res.status(400).json({ message: 'discountPercent required for percent offers' });
    }
    if (kind === 'fixed' && (b.salePrice == null || b.originalPrice == null)) {
      return res.status(400).json({ message: 'salePrice and originalPrice required for fixed-price display' });
    }
    const discountPercent =
      kind === 'fixed' ? 0 : Math.min(100, Math.max(0, Number(b.discountPercent)));
    const originalPrice =
      b.originalPrice != null && b.originalPrice !== '' ? Number(b.originalPrice) : null;
    const salePrice =
      b.salePrice != null && b.salePrice !== '' ? Number(b.salePrice) : null;
    if (originalPrice != null && salePrice != null && salePrice > originalPrice) {
      return res.status(400).json({ message: 'salePrice cannot exceed originalPrice' });
    }
    const item = await Offer.create({
      title: b.title,
      description: b.description || '',
      image: typeof b.image === 'string' ? b.image : '',
      originalPrice: Number.isFinite(originalPrice) ? originalPrice : null,
      discountKind: kind,
      salePrice: Number.isFinite(salePrice) ? salePrice : null,
      discountPercent,
      isFeatured: !!b.isFeatured,
      showOnStorefront: b.showOnStorefront !== false,
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
    delete updates._id;
    if (b.discountKind != null) updates.discountKind = b.discountKind === 'fixed' ? 'fixed' : 'percent';
    if (b.discountPercent != null) updates.discountPercent = Number(b.discountPercent);
    if (b.originalPrice !== undefined) {
      const v = b.originalPrice === '' || b.originalPrice == null ? null : Number(b.originalPrice);
      updates.originalPrice = Number.isFinite(v) ? v : null;
    }
    if (b.salePrice !== undefined) {
      const v = b.salePrice === '' || b.salePrice == null ? null : Number(b.salePrice);
      updates.salePrice = Number.isFinite(v) ? v : null;
    }
    if (b.image !== undefined) updates.image = typeof b.image === 'string' ? b.image : '';
    if (b.isFeatured !== undefined) updates.isFeatured = !!b.isFeatured;
    if (b.showOnStorefront !== undefined) updates.showOnStorefront = !!b.showOnStorefront;
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

module.exports = { list, listPublic, getOne, create, update, remove };
