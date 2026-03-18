const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');

const populateProducts = {
  path: 'products',
  populate: { path: 'category', select: 'name' },
};

async function add(req, res, next) {
  try {
    const userId = req.user._id;
    let { productId } = req.body;
    if (req.body.userId && req.body.userId !== userId.toString()) {
      return res.status(403).json({ message: 'Cannot modify another user wishlist' });
    }
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid productId required' });
    }
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await Wishlist.findOneAndUpdate(
      { userId },
      { $addToSet: { products: productId } },
      { upsert: true, new: true }
    );
    const doc = await Wishlist.findOne({ userId }).populate(populateProducts);
    res.json({
      success: true,
      productIds: (doc.products || []).map((p) => p._id.toString()),
      products: doc.products || [],
    });
  } catch (e) {
    next(e);
  }
}

async function remove(req, res, next) {
  try {
    const userId = req.user._id;
    const { productId } = req.body;
    if (req.body.userId && req.body.userId !== userId.toString()) {
      return res.status(403).json({ message: 'Cannot modify another user wishlist' });
    }
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid productId required' });
    }
    await Wishlist.findOneAndUpdate({ userId }, { $pull: { products: productId } });
    const doc = await Wishlist.findOne({ userId }).populate(populateProducts);
    res.json({
      success: true,
      productIds: (doc?.products || []).map((p) => p._id.toString()),
      products: doc?.products || [],
    });
  } catch (e) {
    next(e);
  }
}

async function getByUserId(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const doc = await Wishlist.findOne({ userId }).populate(populateProducts);
    const products = doc?.products || [];
    res.json({
      success: true,
      productIds: products.map((p) => p._id.toString()),
      products,
      count: products.length,
    });
  } catch (e) {
    next(e);
  }
}

async function clear(req, res, next) {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    await Wishlist.findOneAndUpdate({ userId }, { $set: { products: [] } });
    res.json({ success: true, productIds: [], products: [], count: 0 });
  } catch (e) {
    next(e);
  }
}

async function getMine(req, res, next) {
  try {
    const userId = req.user._id;
    const doc = await Wishlist.findOne({ userId }).populate(populateProducts);
    const products = doc?.products || [];
    res.json({
      success: true,
      productIds: products.map((p) => p._id.toString()),
      products,
      count: products.length,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { add, remove, getByUserId, clear };
