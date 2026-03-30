const router = require('express').Router();
const ctrl = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

router.get('/', protect, ctrl.getCart);
router.post('/', protect, ctrl.addToCart);
router.put('/', protect, ctrl.updateCartItem);
router.delete('/', protect, ctrl.removeCartItem);
router.delete('/clear', protect, ctrl.clearCart);

module.exports = router;

