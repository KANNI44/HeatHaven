const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    brand: { type: String, required: true, trim: true, maxlength: 60 },
    colorway: { type: String, default: '', trim: true },
    category: { type: String, default: 'all', trim: true },
    imageMain: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    variants: { type: [productVariantSchema], default: [] },
  },
  { timestamps: true }
);

productSchema.index({ legacyId: 1 });

module.exports = mongoose.model('Product', productSchema);

