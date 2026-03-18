const express = require('express');
const router = express.Router();
const categoryCtrl = require('../controllers/categoryController');
const collectionCtrl = require('../controllers/collectionController');
const productCtrl = require('../controllers/productController');
const orderCtrl = require('../controllers/orderController');
const reviewCtrl = require('../controllers/reviewController');
const heroCtrl = require('../controllers/heroController');
const wishlistAdminCtrl = require('../controllers/wishlistAdminController');

router.get('/categories', (req, res) => {
  req.query.active = 'true';
  return categoryCtrl.list(req, res);
});
router.get('/collections', (req, res) => {
  req.query.active = 'true';
  return collectionCtrl.listStorefront(req, res);
});
router.get('/hero-sale', heroCtrl.getHeroSale);
router.get('/most-wishlisted', wishlistAdminCtrl.mostWishlisted);
router.get('/products', productCtrl.listPublic);
router.get('/products/slug/:slug', productCtrl.getBySlug);
router.post('/orders/checkout', orderCtrl.createCheckout);
router.post('/reviews', reviewCtrl.createPublic);
router.get('/reviews/product/:productId', reviewCtrl.listByProduct);

module.exports = router;
