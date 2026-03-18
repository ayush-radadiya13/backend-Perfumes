const express = require('express');
const router = express.Router();
const { authAdmin } = require('../middleware/auth');
const { getUpload } = require('../middleware/upload');
const upload = getUpload();

/** Multipart collection create/update (file field: image); JSON requests pass through. */
function optionalCollectionImage(req, res, next) {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    return upload.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message || 'Invalid image' });
      next();
    });
  }
  next();
}

const auth = require('../controllers/adminAuthController');
const categoryCtrl = require('../controllers/categoryController');
const collectionCtrl = require('../controllers/collectionController');
const productCtrl = require('../controllers/productController');
const offerCtrl = require('../controllers/offerController');
const orderCtrl = require('../controllers/orderController');
const reviewCtrl = require('../controllers/reviewController');
const wishlistAdminCtrl = require('../controllers/wishlistAdminController');
const analyticsCtrl = require('../controllers/analyticsController');
const uploadCtrl = require('../controllers/uploadController');

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', authAdmin, auth.me);

router.get('/analytics/dashboard', authAdmin, analyticsCtrl.dashboard);
router.get('/analytics/most-purchased', authAdmin, analyticsCtrl.mostPurchased);
router.get('/analytics/monthly-sales', authAdmin, analyticsCtrl.monthlySales);
router.get('/analytics/graph', authAdmin, analyticsCtrl.graph);

router.post('/upload', authAdmin, upload.single('image'), uploadCtrl.uploadImage);

router.get('/categories', authAdmin, categoryCtrl.list);
router.get('/categories/:id', authAdmin, categoryCtrl.getOne);
router.post('/categories', authAdmin, categoryCtrl.create);
router.put('/categories/:id', authAdmin, categoryCtrl.update);
router.delete('/categories/:id', authAdmin, categoryCtrl.remove);

router.get('/collections', authAdmin, collectionCtrl.list);
router.get('/collections/:id', authAdmin, collectionCtrl.getOne);
router.post('/collections', authAdmin, optionalCollectionImage, collectionCtrl.create);
router.put('/collections/:id', authAdmin, optionalCollectionImage, collectionCtrl.update);
router.patch('/collections/:id', authAdmin, optionalCollectionImage, collectionCtrl.update);
router.delete('/collections/:id', authAdmin, collectionCtrl.remove);

router.get('/products', authAdmin, productCtrl.listAdmin);
router.get('/products/:id', authAdmin, productCtrl.getOneAdmin);
router.post('/products', authAdmin, productCtrl.create);
router.put('/products/:id', authAdmin, productCtrl.update);
router.delete('/products/:id', authAdmin, productCtrl.remove);

router.get('/offers', authAdmin, offerCtrl.list);
router.get('/offers/:id', authAdmin, offerCtrl.getOne);
router.post('/offers', authAdmin, offerCtrl.create);
router.put('/offers/:id', authAdmin, offerCtrl.update);
router.delete('/offers/:id', authAdmin, offerCtrl.remove);

router.get('/orders', authAdmin, orderCtrl.listAdmin);
router.patch('/orders/:id/status', authAdmin, orderCtrl.updateStatus);

router.get('/reviews', authAdmin, reviewCtrl.listAdmin);

router.get('/wishlists/analytics/most-wishlisted', authAdmin, wishlistAdminCtrl.mostWishlisted);
router.get('/wishlists', authAdmin, wishlistAdminCtrl.listAll);
router.get('/wishlists/:userId', authAdmin, wishlistAdminCtrl.getUserWishlist);
router.delete('/wishlists/:userId/products/:productId', authAdmin, wishlistAdminCtrl.removeProduct);
router.delete('/wishlists/:userId', authAdmin, wishlistAdminCtrl.clearUserWishlist);

module.exports = router;
