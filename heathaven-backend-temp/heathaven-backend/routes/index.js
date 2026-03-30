// ── cart.js ──────────────────────────────────────────────────────────────────
const cartRouter = require('express').Router();
const cartCtrl   = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

cartRouter.get   ('/',            protect, cartCtrl.getCart);
cartRouter.post  ('/',            protect, cartCtrl.addToCart);
cartRouter.put   ('/:cartItemId', protect, cartCtrl.updateCartItem);
cartRouter.delete('/',            protect, cartCtrl.clearCart);
cartRouter.delete('/:cartItemId', protect, cartCtrl.removeCartItem);

// ── orders.js ─────────────────────────────────────────────────────────────────
const orderRouter = require('express').Router();
const orderCtrl   = require('../controllers/orderController');
const { adminOnly } = require('../middleware/auth');

orderRouter.get ('  /',           protect, orderCtrl.getMyOrders);
orderRouter.get ('/:id',          protect, orderCtrl.getOrder);
orderRouter.post('/',             protect, orderCtrl.placeOrder);
orderRouter.put ('/:id/cancel',   protect, orderCtrl.cancelOrder);

// Admin
orderRouter.get ('/admin/all',        protect, adminOnly, orderCtrl.getAllOrders);
orderRouter.put ('/admin/:id/status', protect, adminOnly, orderCtrl.updateOrderStatus);

// ── payment.js ────────────────────────────────────────────────────────────────
const payRouter = require('express').Router();
const payCtrl   = require('../controllers/paymentController');

payRouter.post('/create-order', protect, payCtrl.createPaymentOrder);
payRouter.post('/verify',       protect, payCtrl.verifyPayment);
payRouter.post('/webhook',               payCtrl.webhook);   // No auth — Razorpay server call

// ── addresses.js ──────────────────────────────────────────────────────────────
const addrRouter = require('express').Router();
const addrCtrl   = require('../controllers/addressController');

addrRouter.get   ('/',    protect, addrCtrl.getAddresses);
addrRouter.post  ('/',    protect, addrCtrl.addAddress);
addrRouter.put   ('/:id', protect, addrCtrl.updateAddress);
addrRouter.delete('/:id', protect, addrCtrl.deleteAddress);

// ── wishlist.js ───────────────────────────────────────────────────────────────
const wishRouter = require('express').Router();
const wishCtrl   = require('../controllers/wishlistController');

wishRouter.get ('/',           protect, wishCtrl.getWishlist);
wishRouter.post('/:productId', protect, wishCtrl.toggleWishlist);

module.exports = { cartRouter, orderRouter, payRouter, addrRouter, wishRouter };
