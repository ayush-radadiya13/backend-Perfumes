const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
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
