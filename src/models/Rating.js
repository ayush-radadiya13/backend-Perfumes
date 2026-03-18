const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

ratingSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
