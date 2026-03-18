const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const User = require('../models/User');

const populateProducts = {
  path: 'products',
  populate: { path: 'category', select: 'name' },
};

async function listAll(req, res, next) {
  try {
    const wishlists = await Wishlist.find().lean();
    const byUser = new Map(
      wishlists.map((w) => [w.userId.toString(), (w.products || []).length])
    );
    const users = await User.find({ role: 'user' }).select('name email').sort({ name: 1 }).lean();
    const list = users.map((u) => ({
      userId: u._id,
      name: u.name,
      email: u.email,
      itemCount: byUser.get(u._id.toString()) || 0,
    }));
    res.json({ wishlists: list });
  } catch (e) {
    next(e);
  }
}

async function getUserWishlist(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    const user = await User.findById(userId).select('name email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const doc = await Wishlist.findOne({ userId }).populate(populateProducts);
    const products = doc?.products || [];
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      products,
      count: products.length,
    });
  } catch (e) {
    next(e);
  }
}

async function removeProduct(req, res, next) {
  try {
    const { userId, productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }
    await Wishlist.findOneAndUpdate({ userId }, { $pull: { products: productId } });
    const doc = await Wishlist.findOne({ userId }).populate(populateProducts);
    res.json({
      success: true,
      products: doc?.products || [],
      count: doc?.products?.length || 0,
    });
  } catch (e) {
    next(e);
  }
}

async function clearUserWishlist(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    await Wishlist.findOneAndUpdate({ userId }, { $set: { products: [] } }, { upsert: false });
    res.json({ success: true, products: [], count: 0 });
  } catch (e) {
    next(e);
  }
}

async function mostWishlisted(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const agg = await Wishlist.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
    const ids = agg.map((x) => x._id);
    const Product = require('../models/Product');
    const prods = await Product.find({ _id: { $in: ids }, isActive: true })
      .populate('category', 'name')
      .lean();
    const order = new Map(ids.map((id, i) => [id.toString(), i]));
    prods.sort((a, b) => (order.get(a._id.toString()) ?? 99) - (order.get(b._id.toString()) ?? 99));
    const withCount = prods.map((p) => ({
      ...p,
      wishlistCount: agg.find((x) => x._id.toString() === p._id.toString())?.count || 0,
    }));
    res.json({ products: withCount });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listAll,
  getUserWishlist,
  removeProduct,
  clearUserWishlist,
  mostWishlisted,
};
