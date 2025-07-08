const http = require('http');
const app = require('./app');

const port = process.env.PORT || 3100;

console.log(port);

const server = http.createServer(app);


server.listen(port);