const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prisma.js');

router.get('/', async (req, res, next) => {
    try {

        const orders = await prisma.order.findMany({
            select: {
                id: true,
                dateOrder: true,
                orderItems: true,
                client: true,
                clientId: false
            }
        });

        const response = {
            total: orders.length,
            orders:
                orders.map(order => ({
                    id: order.id,
                    dateOrder: order.dateOrder,
                    orderItems: order.orderItems,
                    client: order.client,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3100/orders/' + order.id
                    }
                })
                )

        };
        // res.status(200).json({ message: 'Handling Get all product successfully' });

        res.status(200).json(response)
    }

    catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
});

router.get('/:orderId', async (req, res, next) => {

    try {

        parsedIdOrder = parseInt(req.params.orderId);

        const order = await prisma.order.findUnique({
            where: { id: parsedIdOrder }
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found, try another id." })
        };

        const response = {
            order: {
                id: order.id,
                dateOrder: order.name,
                orderItems: order.orderItems,
                clientId: order.clientId,
                client: order.client
            },
            request: {
                type: 'GET',
                url: 'http://localhost:3100/orders',
                comment: 'look at all orders'
            }
        }
        res.status(200).json({ message: 'Handling Get a specific product successfully' });

        // res.status(200).json(response);

    }
    catch (error) {
        res.status(500).json({ error: error });
    }
});

router.post('/', async (req, res, next) => {

    try {

        const order = await prisma.order.create({
            data: {

            }
        });

        res.status(201).json({
            message: "Product created!",
            product: product,
            request: {
                type: 'GET',
                url: 'http://localhost:3100/products/' + product.id,
                comment: 'Get all info of this product!'
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error })
    }


});


// router.patch('/:productId')

// router.delete('/:productId')











module.exports = router;
