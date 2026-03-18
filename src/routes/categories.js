const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { create, update } = require('../validators/categoryValidator');

const router = express.Router();

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getOne);

router.post('/', protect, adminOnly, upload.single('image'), create, categoryController.create);
router.patch('/:id', protect, adminOnly, upload.single('image'), update, categoryController.update);
router.delete('/:id', protect, adminOnly, categoryController.remove);

module.exports = router;
