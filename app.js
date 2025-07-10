const express = require('express');

const app = express();

app.use(express.json());

const productRoutes = require('./api/routes/products');
const orderRoutes = require('./api/routes/orders');
const clientRoutes = require('./api/routes/clients');


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({})
    }
    next();
});

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/clients', clientRoutes);


module.exports = app;
