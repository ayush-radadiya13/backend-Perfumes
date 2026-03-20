const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { timingSafeEqualString } = require('../utils/cryptoUtil');

function generateTransactionId() {
  const suffix = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `TXN-${Date.now()}-${suffix}`;
}

async function restockOrderItems(order) {
  for (const line of order.items || []) {
    await Product.updateOne(
      { _id: line.product },
      { $inc: { stock: line.quantity, purchaseCount: -line.quantity } }
    );
  }
}

/**
 * POST /api/payments/dummy/complete
 * Body: { orderId, paymentToken, outcome: 'success' | 'failure' }
 * Verifies token server-side; never trusts query params alone for success.
 */
async function dummyPaymentComplete(req, res) {
  const delayMs = 1000 + Math.floor(Math.random() * 1000);
  await new Promise((r) => setTimeout(r, delayMs));

  try {
    const { orderId, paymentToken, outcome } = req.body || {};
    if (!orderId || !paymentToken) {
      return res.status(400).json({ message: 'orderId and paymentToken required' });
    }
    if (outcome !== 'success' && outcome !== 'failure') {
      return res.status(400).json({ message: 'outcome must be success or failure' });
    }

    const order = await Order.findById(orderId).select('+paymentToken');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!timingSafeEqualString(String(paymentToken), String(order.paymentToken || ''))) {
      return res.status(403).json({ message: 'Invalid payment verification' });
    }

    if (order.paymentStatus !== 'pending') {
      if (order.paymentStatus === 'paid' && order.transactionId) {
        return res.json({
          ok: true,
          duplicate: true,
          paymentStatus: 'paid',
          transactionId: order.transactionId,
          order: publicOrderSnapshot(order),
        });
      }
      if (order.paymentStatus === 'failed') {
        return res.status(409).json({
          message: 'Payment already failed for this order',
          paymentStatus: 'failed',
        });
      }
      return res.status(409).json({
        message: 'This order is no longer awaiting payment',
        paymentStatus: order.paymentStatus,
      });
    }

    if (outcome === 'failure') {
      const failed = await Order.findOneAndUpdate(
        {
          _id: order._id,
          paymentStatus: 'pending',
          paymentToken: order.paymentToken,
        },
        {
          $set: {
            paymentStatus: 'failed',
            status: 'cancelled',
            paymentToken: null,
          },
        },
        { new: true }
      );
      if (!failed) {
        return res.status(409).json({ message: 'Payment could not be updated (order changed)' });
      }
      await restockOrderItems(failed);
      return res.json({
        ok: true,
        paymentStatus: 'failed',
        order: publicOrderSnapshot(failed),
      });
    }

    const transactionId = generateTransactionId();
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: 'pending',
        paymentToken: order.paymentToken,
      },
      {
        $set: {
          paymentStatus: 'paid',
          status: 'paid',
          transactionId,
          paymentToken: null,
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ message: 'Payment could not be completed (order changed)' });
    }

    return res.json({
      ok: true,
      paymentStatus: 'paid',
      transactionId,
      order: publicOrderSnapshot(updated),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Payment error' });
  }
}

function publicOrderSnapshot(order) {
  const o = order.toObject ? order.toObject() : order;
  return {
    _id: o._id,
    orderNumber: o.orderNumber,
    items: o.items,
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
    transactionId: o.transactionId,
    customerEmail: o.customerEmail,
    customerName: o.customerName,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

module.exports = {
  dummyPaymentComplete,
  publicOrderSnapshot,
  restockOrderItems,
};
