const router = require('express').Router();
const ctrl   = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

// Public
router.get('/',    ctrl.getProducts);
router.get('/:id', ctrl.getProduct);

// Admin only
router.post('/',                              protect, adminOnly, ctrl.createProduct);
router.put ('/:id',                           protect, adminOnly, ctrl.updateProduct);
router.put ('/:id/variants/:variantId',       protect, adminOnly, ctrl.updateVariant);
router.delete('/:id',                         protect, adminOnly, ctrl.deleteProduct);

module.exports = router;
