const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');

const adminCtrl = require('../controllers/adminController');
const productsCtrl = require('../controllers/productsController');

router.post('/login', adminCtrl.adminLogin);

router.use(protect, adminOnly);

// Users
router.get('/users', adminCtrl.listUsers);
router.put('/users/:id', adminCtrl.updateUser);
router.delete('/users/:id', adminCtrl.deleteUser);

// Products
router.post('/products', productsCtrl.createProduct);
router.put('/products/:legacyId', productsCtrl.updateProduct);
router.delete('/products/:legacyId', productsCtrl.deleteProduct);
router.put('/products/:legacyId/variants/:size', productsCtrl.updateVariant);

// Orders
router.get('/orders', adminCtrl.listAllOrders);
router.put('/orders/:id/status', adminCtrl.updateOrderStatus);

module.exports = router;

