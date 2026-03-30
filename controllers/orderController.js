const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');

function computeTotals(subtotal) {
  const shipping = subtotal >= 50000 ? 0 : 1000;
  const tax = subtotal * 0.1;
  const total = subtotal + shipping + tax;
  return { shipping, tax, total };
}

function buildOrderItems(cartItems) {
  return cartItems.map(i => ({
    productLegacyId: i.productLegacyId,
    name: i.product?.name || '',
    brand: i.product?.brand || '',
    colorway: i.product?.colorway || '',
    size: i.size,
    unitPrice: i.unitPrice,
    qty: i.qty,
    imageMain: i.imageMain,
  }));
}

async function placeOrder(req, res) {
  const { shippingAddress, notes, payment } = req.body || {};
  const pay = payment || {};
  const method = pay.method || 'netbanking';
  const bank = pay.bank || '';
  const simulateOutcome = pay.simulateOutcome; // optional deterministic testing

  const cart = await Cart.findOne({ userId: req.user._id }).lean();
  const cartItems = cart?.items || [];
  if (!cartItems.length) return res.status(400).json({ success: false, message: 'Your cart is empty.' });

  // Enrich items + validate stock.
  let subtotal = 0;
  const enriched = [];
  for (const item of cartItems) {
    const product = await Product.findOne({ legacyId: item.productLegacyId, isActive: true }).lean();
    if (!product) return res.status(400).json({ success: false, message: 'One or more products no longer exist.' });
    const variant = product.variants.find(v => v.size === item.size);
    if (!variant) return res.status(400).json({ success: false, message: `Size not available for ${product.name}.` });
    if (variant.stock < item.qty) {
      return res.status(400).json({ success: false, message: `Not enough stock for ${product.name} (${item.size}).` });
    }
    const unitPrice = item.unitPrice ?? variant.price;
    subtotal += unitPrice * item.qty;
    enriched.push({
      ...item,
      product,
      variant,
      unitPrice,
      imageMain: product.imageMain || item.imageMain,
    });
  }

  const { shipping, tax, total } = computeTotals(subtotal);

  const orderNumber =
    'HH' +
    Date.now().toString().slice(-8) +
    Math.floor(Math.random() * 90 + 10).toString();

  const statusSeed = method === 'netbanking' ? 'pending_payment' : 'confirmed';
  let status = statusSeed;
  let paymentStatus = 'unpaid';

  if (method === 'netbanking') {
    const outcome =
      simulateOutcome ||
      (Math.random() < Number(pay.successRate ?? 0.8) ? 'success' : 'failure');

    if (outcome === 'success') {
      status = 'confirmed';
      paymentStatus = 'paid';
    } else {
      status = 'payment_failed';
      paymentStatus = 'failed';
    }
  } else {
    // Other options are mocked as successful for now.
    status = 'confirmed';
    paymentStatus = 'paid';
  }

  const orderItems = enriched.map(i => ({
    productLegacyId: i.productLegacyId,
    name: i.product.name,
    brand: i.product.brand,
    colorway: i.product.colorway,
    size: i.size,
    unitPrice: i.unitPrice,
    qty: i.qty,
    imageMain: i.imageMain,
  }));

  const order = await Order.create({
    orderNumber,
    userId: req.user._id,
    items: orderItems,
    subtotal,
    shipping,
    tax,
    total,
    shippingAddress: shippingAddress || {},
    notes: notes || '',
    payment: {
      method,
      bank: bank || '',
      paymentStatus,
    },
    status,
  });

  if (status === 'confirmed') {
    // Decrement stock best-effort.
    for (const i of enriched) {
      await Product.updateOne(
        { legacyId: i.productLegacyId, 'variants.size': i.size, 'variants.stock': { $gte: i.qty } },
        { $inc: { 'variants.$.stock': -i.qty } }
      );
    }
    await Cart.deleteOne({ userId: req.user._id });
  }

  res.status(201).json({
    success: true,
    message: status === 'confirmed' ? 'Order confirmed! 🎉' : 'Payment failed. Order not confirmed.',
    data: { orderId: order._id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.payment.paymentStatus, total: order.total },
  });
}

async function getMyOrders(req, res) {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: orders });
}

async function getOrder(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
  res.json({ success: true, data: order });
}

async function cancelOrder(req, res) {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

  if (['confirmed', 'shipped', 'delivered'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage.' });
  }

  order.status = 'cancelled';
  order.payment.paymentStatus = order.payment.paymentStatus === 'paid' ? 'paid' : 'unpaid';
  await order.save();

  res.json({ success: true, message: 'Order cancelled.' });
}

module.exports = { placeOrder, getMyOrders, getOrder, cancelOrder };

