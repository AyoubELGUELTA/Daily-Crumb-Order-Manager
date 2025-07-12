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
        // res.status(200).json({ message: 'Handling Get a specific product successfully' });

        res.status(200).json(response);

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
            }
        });

        res.status(201).json({
            order: order,
            message: "(empty) order created!",
            request: {
                type: 'GET',
                url: 'http://localhost:3100/orders',
                comment: 'Get all orders?'
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }


});

router.post('/:orderId/items', async (req, res, next) => {
    try {
        const parsedOrderId = parseInt(req.params.orderId);
        const { productId, quantity } = req.body;

        if (isNaN(parsedOrderId)) {
            return res.status(400).json({ message: 'Invalid order ID. Must be a number.' });
        }

        const existingOrder = prisma.order.findUnique({
            where: { id: parsedOrderId }
        });

        if (!existingOrder) {
            return res.status(404).json({ message: `Order with ID ${parsedOrderId} not found.` });
        }
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required.' });
        }
        if (quantity !== undefined) {
            const parsedQuantity = parseInt(quantity);
            if (isNaN(parsedQuantity) || parsedQuantity < 1) {
                return res.status(400).json({ message: 'Quantity must be a positive number.' });
            }
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }



        const existingOrderItem = await prisma.orderItem.findFirst({
            where: {
                id: parsedOrderId,
                productId: productId
            }
        });

        if (existingOrderItem) {
            await prisma.orderItem.update({
                where: {
                    id: existingOrderItem.id,
                    orderId: parsedOrderId
                },
                data: { quantity: existingOrderItem.quantity + quantity },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true
                        }
                    }
                }
            });

            res.status(201).json({
                message: "Order item added (updated)!",
                product: {
                    id: existingOrderItem.productId,
                    quantity: existingOrderItem.quantity,
                    orderId: parsedOrderId
                },
                request: {
                    type: 'GET',
                    url: "http://localhost:3100/" + String(parsedOrderId),
                    comment: "Look at the order details"
                }
            })

        }


        else {


            const newOrderItem = await prisma.orderItem.create({
                data: {
                    quantity: quantity || 1,
                    orderId: parsedOrderId,
                    productId: productId
                },
                include: {
                    product: {
                        select: {
                            name: true,
                            price: true,
                        }
                    }
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





    }

    catch (error) {
        res.status(500).json({ error: error.message });
    }
})
router.patch('/:orderId/items', async (req, res, next) => {
    try {

        const productId = parseInt(req.body.productId);
        if (!productId) {
            return res.status(500).json({ message: "Choose what do you want to update." })
        }
        const orderId = parsedInt(req.params.orderId);

        const quantity = parseInt(req.body.quantity);

        const orderItemToUpdate = prisma.orderItem.update({
            where: {
                orderId: orderId,
                productId: productId
            },
            data: {
                quantity: quantity
            }
        });

        // res.status(204).json({ UPDATED BLABLABLA... })


    }

    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:orderId/items', async (req, res, next) => {
    try {

        const productId = parseInt(req.body.productId);
        if (!productId) {
            return res.status(500).json({ message: "Choose what item you want to delete." })
        }
        const orderId = parsedInt(req.params.orderId);

        const quantity = parseInt(req.body.quantity);

        const orderItemToDelete = prisma.orderItem.update({
            where: {
                orderId: orderId,
                productId: productId
            },
            data: {
                quantity: quantity
            }
        })
    }

    catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.delete('/:orderId', async (req, res, next) => {
    try {
        const parsedOrderId = parseInt(req.params.orderId);

        console.log(parsedOrderId)



        const orderToDelete = await prisma.order.findUnique({
            where: { id: parsedOrderId }
        });

        if (!orderToDelete) {
            res.status(404).json({ error: "Order id not found." })
        }

        await prisma.order.delete({
            where: { id: parsedOrderId }
        });

        res.status(204).send();

    }

    catch (error) {
        console.error("Error deleting order: ", error)
        res.status(500).json({ error: error.message });
    }
});










module.exports = router;
