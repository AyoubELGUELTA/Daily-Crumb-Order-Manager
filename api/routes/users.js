const express = require('express');
const router = express.Router();


const authenticateToken = require('../middlewares/auth.js');

const UsersControllers = require('../controllers/users.js')

router.post('/signup', UsersControllers.user_signup);

router.get('/verifyEmail', UsersControllers.user_verifyEmail);

router.post('/login', UsersControllers.user_login);

router.delete('/:userId', authenticateToken, UsersControllers.delete_user);

router.get('/', authenticateToken, UsersControllers.user_get);

module.exports = router;


