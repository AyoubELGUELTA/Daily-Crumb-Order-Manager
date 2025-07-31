
const express = require('express');
const router = express.Router();


const authenticateToken = require('../middlewares/auth.js');

const ClientsControllers = require('../controllers/clients.js');
const checkAdminRole = require('../middlewares/checkAdmin.js');
const checkAdminEmployeeRole = require('../middlewares/checkAdminOrEmployee.js');

router.post('/', authenticateToken, checkAdminRole, ClientsControllers.create_new_client);

router.get('/', authenticateToken, checkAdminEmployeeRole, ClientsControllers.get_client);

router.get('/:clientId', authenticateToken, checkAdminEmployeeRole, ClientsControllers.get_client_orders);

router.delete('/:clientId', authenticateToken, checkAdminRole, ClientsControllers.delete_client);



module.exports = router