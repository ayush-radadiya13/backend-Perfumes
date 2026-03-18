const { validationResult } = require('express-validator');
const Rating = require('../models/Rating');
const Product = require('../models/Product');

async function recalcProductRating(productId) {
  const stats = await Rating.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0;
  const count = stats[0] ? stats[0].count : 0;
  await Product.findByIdAndUpdate(productId, { rating: avg, ratingCount: count });
}

exports.add = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const { product, stars, review } = req.body;
    const prod = await Product.findById(product);
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
    let rating = await Rating.findOne({ user: req.user._id, product });
    if (rating) {
      rating.stars = Number(stars);
      rating.review = review || '';
      await rating.save();
    } else {
      rating = await Rating.create({
        user: req.user._id,
        product,
        stars: Number(stars),
        review: review || '',
      });
    }
    await recalcProductRating(product);
    await rating.populate('user', 'name');
    res.status(rating.createdAt === rating.updatedAt ? 201 : 200).json({ success: true, data: rating });
  } catch (e) {
    next(e);
  }
};

exports.getByProduct = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ product: req.params.productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (e) {
    next(e);
  }
};

exports.getAllAdmin = async (req, res, next) => {
  try {
    const ratings = await Rating.find().populate('user', 'name email').populate('product', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (e) {
    next(e);
  }
};
