const express = require('express');
const router = express.Router();


const authenticateToken = require('../middlewares/auth.js');

const OrdersControllers = require('../controllers/orders.js');
const checkAdminEmployeeRole = require('../middlewares/checkAdminOrEmployee.js');


router.get('/', authenticateToken, checkAdminEmployeeRole, OrdersControllers.get_orders);

router.post('/', authenticateToken, checkAdminEmployeeRole, OrdersControllers.initialize_order);

router.post('/:orderId/items', authenticateToken, checkAdminEmployeeRole, OrdersControllers.post_item_order);

router.patch('/:orderId/items', authenticateToken, checkAdminEmployeeRole, OrdersControllers.update_item_order);

router.delete('/:orderId/items', checkAdminEmployeeRole, OrdersControllers.delete_item_order);

router.get('/stats', authenticateToken, checkAdminEmployeeRole, OrdersControllers.get_stats);





module.exports = router;
