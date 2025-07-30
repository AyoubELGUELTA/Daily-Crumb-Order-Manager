const express = require('express');
const router = express.Router();


const authenticateToken = require('../middlewares/auth.js');

const OrdersControllers = require('../controllers/orders.js');


router.get('/', authenticateToken, OrdersControllers.get_orders);

router.post('/', authenticateToken, OrdersControllers.initialize_order);

router.post('/:orderId/items', authenticateToken, OrdersControllers.post_item_order);

router.patch('/:orderId/items', authenticateToken, OrdersControllers.update_item_order);

router.delete('/:orderId/items', OrdersControllers.delete_item_order);

router.get('/stats', authenticateToken, OrdersControllers.get_stats);





module.exports = router;
