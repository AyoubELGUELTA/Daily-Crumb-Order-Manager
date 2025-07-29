
const express = require('express');
const router = express.Router();


const authenticateToken = require('../middlewares/auth.js');

const ClientsControllers = require('../controllers/clients.js');

router.post('/', authenticateToken, ClientsControllers.create_new_client);

router.get('/', authenticateToken, ClientsControllers.get_client);

router.get('/:clientId', authenticateToken, ClientsControllers.get_client_orders);

router.delete('/:clientId', authenticateToken, ClientsControllers.delete_client);



module.exports = router