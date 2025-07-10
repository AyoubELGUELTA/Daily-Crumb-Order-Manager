const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');

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
        // res.status(200).json({ message: 'Handling Get all orders successfully' });

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
                clientId: order.clientId
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

        const parsedClientid = parseInt(req.body.clientId)

        const order = await prisma.order.create({
            data: {
                clientId: parsedClientid
            },
            client: {
                connect: { id: parsedClientid }
            }
        });

        res.status(201).json({
            message: "(empty) order created!",
            request: {
                type: 'GET',
                url: 'http://localhost:3100/orders',
                comment: 'Get all orders?'
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error })
    }


});

router.post('/:orderId/items', async (req, res, next) => {
    try {
        const orderId = parseInt(req.params.orderId);
        const { productId, quantity } = req.body;

        if (isNaN(orderId)) {
            return res.status(400).json({ message: 'Invalid order ID. Must be a number.' });
        }
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required.' });
        }
        if (quantity !== none) {
            const parsedQuantity = parseInt(quantity);
            if (isNaN(parsedQuantity) || parsedQuantity < 1) {
                return res.status(400).json({ message: 'Quantity must be a positive number.' });
            }
        }
        const existingOrder = await prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!existingOrder) {
            return res.status(404).json({ message: `Order with ID ${orderId} not found.` });
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }


        const newOrderItem = await prisma.orderItem.create({
            data: {
                quantity: quantity || 1,
                orderId: parsedOrderId,
                productId: productId
            },
            order: {
                connect: { id: orderId }
            },
            product: {
                connect: { id: productId }
            },
            include: {
                product: true
            }
        });

        res.status(201).json({
            message: 'Order item added successfully to order.',
            orderItem: newOrderItem,
            request: {
                type: "GET",
                url: `http://localhost:3100/orders/${orderId}`,
                comment: 'View the updated order details'
            }
        })





    }

    catch (err) {

    }
})
// router.patch('/:productId')

// router.delete('/:productId')











module.exports = router;
