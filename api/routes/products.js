const express = require('express')
const router = express.Router();

const authenticateToken = require('../middlewares/auth');

const ProductsControllers = require('../controllers/products');



router.get('/', ProductsControllers.get_product);

router.get('/:productId', ProductsControllers.get_single_product);

router.post('/', authenticateToken, ProductsControllers.post_new_product);

router.delete('/:productId', authenticateToken, ProductsControllers.delete_product);

router.patch('/:productId', authenticateToken, ProductsControllers.update_product);


module.exports = router;
