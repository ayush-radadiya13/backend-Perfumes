const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: null },
    sku: { type: String, trim: true, default: '' },
    images: [{ type: String }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
    stock: { type: Number, default: 0, min: 0 },
    volumeMl: { type: Number, default: 50 },
    fragranceNotes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    purchaseCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
