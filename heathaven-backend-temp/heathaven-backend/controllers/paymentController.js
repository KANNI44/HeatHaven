const crypto  = require('crypto');
const { body } = require('express-validator');
const pool    = require('../config/db');
const { validate } = require('../middleware/error');

// Lazily initialise Razorpay so the server starts even without keys set
let Razorpay;
const getRazorpay = () => {
  if (!Razorpay) {
    const RazorpaySDK = require('razorpay');
    Razorpay = new RazorpaySDK({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return Razorpay;
};

// ── POST /api/payment/create-order ────────────────────────────────────────────
// Called after placeOrder; creates a Razorpay order for the HH order total
const createPaymentOrder = [
  body('order_id').isInt({ min: 1 }),
  validate,
  async (req, res, next) => {
    try {
      const { order_id } = req.body;

      const [rows] = await pool.query(
        'SELECT * FROM orders WHERE id = ? AND user_id = ? AND payment_status = "unpaid"',
        [order_id, req.user.id]
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Order not found or already paid.' });

      const order = rows[0];
      const rzp   = getRazorpay();

      const rzpOrder = await rzp.orders.create({
        amount:   Math.round(order.total * 100), // paise
        currency: 'INR',
        receipt:  `hh_order_${order.id}`,
        notes:    { hh_order_id: String(order.id), user_id: String(req.user.id) },
      });

      // Store Razorpay order ID
      await pool.query('UPDATE orders SET razorpay_order_id = ? WHERE id = ?', [rzpOrder.id, order.id]);

      res.json({
        success: true,
        razorpay: {
          order_id:   rzpOrder.id,
          amount:     rzpOrder.amount,
          currency:   rzpOrder.currency,
          key_id:     process.env.RAZORPAY_KEY_ID,
        },
        order: { id: order.id, total: order.total },
      });
    } catch (err) { next(err); }
  },
];

// ── POST /api/payment/verify ──────────────────────────────────────────────────
// Called client-side after Razorpay checkout success
const verifyPayment = [
  body('razorpay_order_id').notEmpty(),
  body('razorpay_payment_id').notEmpty(),
  body('razorpay_signature').notEmpty(),
  validate,
  async (req, res, next) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // Validate HMAC signature
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expected !== razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
      }

      // Mark order as paid
      const [result] = await pool.query(
        `UPDATE orders
            SET payment_status      = 'paid',
                status              = 'confirmed',
                razorpay_payment_id = ?
          WHERE razorpay_order_id = ? AND user_id = ?`,
        [razorpay_payment_id, razorpay_order_id, req.user.id]
      );

      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: 'Order not found for this payment.' });
      }

      res.json({ success: true, message: 'Payment verified! Your order is confirmed. 🎉' });
    } catch (err) { next(err); }
  },
];

// ── POST /api/payment/webhook  (Razorpay server-to-server) ───────────────────
// Register this URL in your Razorpay dashboard → Webhooks
const webhook = async (req, res) => {
  try {
    const secret    = process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body      = JSON.stringify(req.body);

    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) return res.status(400).send('Invalid signature');

    const event = req.body.event;
    const pay   = req.body.payload?.payment?.entity;

    if (event === 'payment.captured' && pay) {
      await pool.query(
        `UPDATE orders
            SET payment_status      = 'paid',
                status              = 'confirmed',
                razorpay_payment_id = ?
          WHERE razorpay_order_id = ?`,
        [pay.id, pay.order_id]
      );
    }

    if (event === 'payment.failed' && pay) {
      // Just log — order stays 'unpaid'
      console.warn(`⚠️  Payment failed for Razorpay order: ${pay.order_id}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).send('Error');
  }
};

module.exports = { createPaymentOrder, verifyPayment, webhook };
