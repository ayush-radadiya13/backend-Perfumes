const express = require('express');
const collectionController = require('../controllers/collectionController');
const { protect, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { create, update } = require('../validators/collectionValidator');

const router = express.Router();

router.get('/', collectionController.getAll);
router.get('/:id', collectionController.getOne);

router.post('/', protect, adminOnly, upload.single('image'), create, collectionController.create);
router.patch('/:id', protect, adminOnly, upload.single('image'), update, collectionController.update);
router.delete('/:id', protect, adminOnly, collectionController.remove);

module.exports = router;
