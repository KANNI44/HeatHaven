const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productLegacyId: { type: Number, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    colorway: { type: String, default: '' },
    size: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 100 },
    imageMain: { type: String, default: '' },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: { type: [orderItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    shippingAddress: { type: addressSchema, default: () => ({}) },
    notes: { type: String, default: '' },

    payment: {
      method: { type: String, default: 'netbanking' }, // netbanking|upi|card|cod
      bank: { type: String, default: '' }, // netbanking only
      paymentStatus: { type: String, default: 'unpaid' }, // unpaid|paid|failed
    },

    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled', 'payment_failed'],
      default: 'pending_payment',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

