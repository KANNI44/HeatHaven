const router = require('express').Router();
const ctrl = require('../controllers/productsController');

router.get('/', ctrl.getProducts);
router.get('/:legacyId', ctrl.getProduct);

module.exports = router;

