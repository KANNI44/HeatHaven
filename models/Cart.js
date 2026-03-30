const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productLegacyId: { type: Number, required: true },
    size: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1, max: 20 },
    unitPrice: { type: Number, required: true, min: 0 }, // price snapshot at add/update time
    imageMain: { type: String, default: '' },
  },
  { timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

// Prevent duplicates for (productLegacyId,size) per cart.
cartSchema.index({ userId: 1, 'items.productLegacyId': 1, 'items.size': 1 }, { unique: false });

module.exports = mongoose.model('Cart', cartSchema);

