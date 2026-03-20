const mongoose = require('mongoose');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    image: String,
    price: Number,
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    orderNumber: { type: String, unique: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    customerEmail: { type: String, trim: true, default: '' },
    customerName: { type: String, trim: true, default: '' },
    shippingAddress: { type: String, default: '' },
    /** pending → paid/failed; fulfillment uses `status` after paid */
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    /** Opaque secret for dummy gateway + verification; cleared after successful payment */
    paymentToken: { type: String, default: null, select: false },
    transactionId: { type: String, default: null, sparse: true, unique: true },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
  if (this.isNew && !this.paymentToken && this.paymentStatus === 'pending') {
    this.paymentToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
