const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Offer = require('../models/Offer');
const { timingSafeEqualString } = require('../utils/cryptoUtil');

function applyOfferToItems(items, offer, productsMap) {
  if (!offer || !offer.isActive) return { discount: 0, items };
  const now = new Date();
  if (now < offer.startDate || now > offer.endDate) return { discount: 0, items };
  let discount = 0;
  const pct = offer.discountPercent / 100;
  const newItems = items.map((line) => {
    const p = productsMap.get(String(line.product));
    if (!p) return line;
    let eligible = false;
    if (offer.appliesTo === 'all') eligible = true;
    else if (offer.appliesTo === 'category' && offer.category && String(p.category) === String(offer.category))
      eligible = true;
    else if (offer.appliesTo === 'product' && offer.products.some((id) => String(id) === String(line.product)))
      eligible = true;
    else if (
      offer.appliesTo === 'collection' &&
      offer.collections.length &&
      (p.collections || []).some((c) => offer.collections.some((id) => String(id) === String(c)))
    )
      eligible = true;
    if (!eligible) return line;
    const lineDisc = line.price * line.quantity * pct;
    discount += lineDisc;
    return line;
  });
  return { discount: Math.round(discount * 100) / 100, items: newItems };
}

async function persistOrder({
  items: rawItems,
  customerEmail,
  customerName,
  shippingAddress,
  offerCode,
  userId,
}) {
  if (!Array.isArray(rawItems) || !rawItems.length) {
    const err = new Error('items required');
    err.status = 400;
    throw err;
  }
  const productIds = rawItems.map((i) => i.productId || i.product);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productsMap = new Map(products.map((p) => [String(p._id), p]));
  let subtotal = 0;
  const lineItems = [];
  for (const row of rawItems) {
    const pid = row.productId || row.product;
    const p = productsMap.get(String(pid));
    if (!p) {
      const err = new Error(`Invalid product ${pid}`);
      err.status = 400;
      throw err;
    }
    const qty = Math.max(1, parseInt(row.quantity, 10) || 1);
    if (p.stock < qty) {
      const err = new Error(`Insufficient stock for ${p.name}`);
      err.status = 400;
      throw err;
    }
    const price = p.price;
    subtotal += price * qty;
    lineItems.push({
      product: p._id,
      name: p.name,
      image: Array.isArray(p.images) && p.images.length ? p.images[0] : '',
      price,
      quantity: qty,
    });
  }

  let discount = 0;
  if (offerCode) {
    const offer = await Offer.findOne({
      code: String(offerCode).toUpperCase(),
      isActive: true,
    })
      .populate('category')
      .populate('products')
      .populate('collections');
    const applied = applyOfferToItems(lineItems, offer, productsMap);
    discount = applied.discount;
  }

  const total = Math.round((subtotal - discount) * 100) / 100;
  const order = await Order.create({
    user: userId || null,
    items: lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    total,
    status: 'pending',
    customerEmail: customerEmail || '',
    customerName: customerName || '',
    shippingAddress: typeof shippingAddress === 'string' ? shippingAddress : JSON.stringify(shippingAddress || ''),
  });

  for (const line of lineItems) {
    await Product.updateOne(
      { _id: line.product },
      { $inc: { stock: -line.quantity, purchaseCount: line.quantity } }
    );
  }

  return order;
}

function orderToJSON(order) {
  const o = order.toObject ? order.toObject() : order;
  const { paymentToken: _omit, ...rest } = o;
  return {
    _id: rest._id,
    orderNumber: rest.orderNumber,
    items: rest.items,
    subtotal: rest.subtotal,
    discount: rest.discount,
    total: rest.total,
    status: rest.status,
    paymentStatus: rest.paymentStatus,
    transactionId: rest.transactionId,
    customerEmail: rest.customerEmail,
    customerName: rest.customerName,
    shippingAddress: rest.shippingAddress,
    createdAt: rest.createdAt,
    updatedAt: rest.updatedAt,
  };
}

/** Public summary for dummy gateway page (no PII beyond what checkout already collected). */
async function getPaymentSummary(req, res) {
  try {
    const { orderId } = req.params;
    const token = req.query.token;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'token required' });
    }
    const order = await Order.findById(orderId).select('+paymentToken');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.paymentToken) {
      return res.json({
        payable: false,
        failed: order.paymentStatus === 'failed',
        order: orderToJSON(order),
      });
    }
    if (!timingSafeEqualString(token, order.paymentToken)) {
      return res.status(403).json({ message: 'Invalid or expired payment link' });
    }

    res.json({
      payable: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Error' });
  }
}

/** POST /api/orders — optional Bearer links order to user */
async function createUserOrder(req, res) {
  try {
    const { items, customerEmail, customerName, shippingAddress, offerCode } = req.body;
    const userId = req.user?._id;
    const order = await persistOrder({
      items,
      customerEmail,
      customerName,
      shippingAddress,
      offerCode,
      userId,
    });
    const withToken = await Order.findById(order._id).select('+paymentToken');
    res.status(201).json({
      order: orderToJSON(withToken),
      paymentToken: withToken.paymentToken,
    });
  } catch (e) {
    const code = e.status || 500;
    if (code >= 500) console.error(e);
    res.status(code).json({ message: e.message || 'Error' });
  }
}

/** Legacy guest checkout */
async function createCheckout(req, res) {
  try {
    const { items, customerEmail, customerName, shippingAddress, offerCode } = req.body;
    const order = await persistOrder({
      items,
      customerEmail,
      customerName,
      shippingAddress,
      offerCode,
      userId: null,
    });
    const withToken = await Order.findById(order._id).select('+paymentToken');
    res.status(201).json({
      order: {
        _id: withToken._id,
        orderNumber: withToken.orderNumber,
        total: withToken.total,
        items: withToken.items,
        status: withToken.status,
        paymentStatus: withToken.paymentStatus,
        transactionId: withToken.transactionId,
      },
      paymentToken: withToken.paymentToken,
    });
  } catch (e) {
    const code = e.status || 500;
    if (code >= 500) console.error(e);
    res.status(code).json({ message: e.message || 'Error' });
  }
}

async function listMyOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders: orders.map((o) => ({ ...o, id: o._id })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}

async function getMyOrder(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ order: { ...order, id: order._id } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message });
  }
}

async function listAdmin(req, res) {
  const { status, page = 1, limit = 30 } = req.query;
  const q = {};
  if (status) q.status = status;
  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const lim = Math.min(100, parseInt(limit, 10) || 30);
  const [items, total] = await Promise.all([
    Order.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate('items.product', 'name slug')
      .populate('user', 'name email')
      .lean(),
    Order.countDocuments(q),
  ]);
  res.json({ items, total, page: parseInt(page, 10), pages: Math.ceil(total / lim) });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) return res.status(404).json({ message: 'Not found' });
  res.json(order);
}

module.exports = {
  createUserOrder,
  createCheckout,
  getPaymentSummary,
  listMyOrders,
  getMyOrder,
  listAdmin,
  updateStatus,
};
