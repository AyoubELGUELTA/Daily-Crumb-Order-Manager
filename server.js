const http = require('http');
const app = require('./app');

const port = process.env.PORT || 3100;

// console.log('DATABASE_URL from .env:', process.env.DATABASE_URL);
console.log(port);

const server = http.createServer(app);


server.listen(port);