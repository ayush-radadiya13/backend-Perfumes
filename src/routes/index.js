const express = require('express');
const auth = require('./auth');
const categories = require('./categories');
const collections = require('./collections');
const products = require('./products');
const offers = require('./offers');
const orders = require('./orders');
const ratings = require('./ratings');
const dashboard = require('./dashboard');

const router = express.Router();

router.use('/auth', auth);
router.use('/categories', categories);
router.use('/collections', collections);
router.use('/products', products);
router.use('/offers', offers);
router.use('/orders', orders);
router.use('/ratings', ratings);
router.use('/dashboard', dashboard);

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;
