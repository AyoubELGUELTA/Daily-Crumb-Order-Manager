const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // if authHeader is undefined, then it doesnt split so it doesnt throw an error, and if it is defined, then it splits it...
    if (!token) return res.status(401).json({ message: "token missing" });
    jwt.verify(token, process.env.JWT_SESSION_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: err.message }); // Forbidden

        req.user = user; // attach decoded token payload to request
        next();
    });
}

module.exports = authenticateToken;