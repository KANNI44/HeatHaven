const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.getMyOrders);
router.get('/:id', protect, ctrl.getOrder);
router.post('/', protect, ctrl.placeOrder);
router.put('/:id/cancel', protect, ctrl.cancelOrder);

module.exports = router;

