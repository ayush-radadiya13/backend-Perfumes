const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    /** Storefront card image (upload URL path). */
    image: { type: String, default: '' },
    /** Shown on marketing cards; cart/checkout still use product prices + percent promo rules. */
    originalPrice: { type: Number, min: 0, default: null },
    discountKind: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent',
    },
    /** When discountKind is fixed, this is the sale price shown on the site. */
    salePrice: { type: Number, min: 0, default: null },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    isFeatured: { type: Boolean, default: false },
    showOnStorefront: { type: Boolean, default: true },
    appliesTo: {
      type: String,
      enum: ['all', 'category', 'product', 'collection'],
      default: 'all',
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    code: { type: String, trim: true, uppercase: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Offer', offerSchema);
