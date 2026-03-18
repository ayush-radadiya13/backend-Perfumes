const Review = require('../models/Review');
const Product = require('../models/Product');

async function createPublic(req, res) {
  try {
    const { productId, customerName, customerEmail, rating, comment } = req.body;
    if (!productId || !customerName || rating == null) {
      return res.status(400).json({ message: 'productId, customerName, rating required' });
    }
    const r = Math.min(5, Math.max(1, parseInt(rating, 10)));
    const p = await Product.findById(productId);
    if (!p || !p.isActive) return res.status(404).json({ message: 'Product not found' });
    const review = await Review.create({
      product: productId,
      customerName: String(customerName).slice(0, 100),
      customerEmail: customerEmail || '',
      rating: r,
      comment: String(comment || '').slice(0, 2000),
    });
    res.status(201).json(review);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
}

async function listByProduct(req, res) {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(reviews);
}

async function listAdmin(req, res) {
  const { page = 1, limit = 50, productId } = req.query;
  const q = {};
  if (productId) q.product = productId;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const lim = Math.min(100, parseInt(limit, 10) || 50);
  const [items, total] = await Promise.all([
    Review.find(q)
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .lean(),
    Review.countDocuments(q),
  ]);
  res.json({ items, total, page: parseInt(page, 10), pages: Math.ceil(total / lim) });
}

module.exports = { createPublic, listByProduct, listAdmin };
