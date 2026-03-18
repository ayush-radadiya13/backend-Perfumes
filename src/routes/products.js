const express = require('express');
const productController = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { create, update } = require('../validators/productValidator');

const router = express.Router();

router.get('/', productController.getAll);
router.get('/:id', productController.getOne);

router.post(
  '/',
  protect,
  adminOnly,
  upload.array('images', 5),
  create,
  productController.create
);
router.patch(
  '/:id',
  protect,
  adminOnly,
  upload.array('images', 5),
  update,
  productController.update
);
router.delete('/:id', protect, adminOnly, productController.remove);

module.exports = router;
