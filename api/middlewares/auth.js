const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // if authHeader is undefined, then it doesnt split so it doesnt throw an error, and if it is defined, then it splits it...
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SESSION_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden

        req.user = user; // attach decoded token payload to request
        next();
    });
}

module.exports = authenticateToken;