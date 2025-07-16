const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');

router.get('/', async (req, res, next) => {
    try {

        const { time, id } = req.query;
        let whereClause = {};

        if (time !== undefined && id !== undefined) {
            return res.status(400).json({ error: "Please, send a single request between time and id queries, not both at the same time." })
        }

        if (id !== undefined) {
            const orderId = parseInt(id)
            if (!Number.isInteger(orderId)) {
                return res.status(400).json({ error: "Id requested is not a int." })
            }

            const singleOrder = await prisma.order.findUnique({
                where: { id: orderId },

                include: {
                    orderItems: {
                        select: {
                            quantity: true,

                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    price: true
                                }
                            }
                        }
                    },
                    client: {
                        select: {
                            id: true,
                            email: true,
                            name: true
                        }
                    }

                }

            })

            if (!singleOrder) {
                return res.status(404).json({ error: "Order not found for id requested." })
            }

            const singleResponse =
            {
                order:
                {
                    id: singleOrder.id,
                    dateOrder: singleOrder.dateOrder,
                    status: singleOrder.status,
                    client: {
                        id: singleOrder.client?.id,
                        email: singleOrder.client?.email,
                        name: singleOrder.client?.name
                    },
                    product: singleOrder.orderItems.map((item) => ({
                        productId: item.product?.id,
                        productName: item.product?.name,
                        productPrice: item.product?.price,
                        quantity: item.quantity

                    })),
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3100/orders/' + singleOrder.id,
                        comment: 'Click to see the order detail !'
                    }

                }
            }

            return res.status(200).json(singleResponse);
        }



        if (time === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);


            whereClause.dateOrder = {
                gte: today,
                lt: tomorrow
            };
        }


        const orders = await prisma.order.findMany({
            where: whereClause,

            include: {
                orderItems: {
                    select: {
                        quantity: true,

                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true
                            }
                        }
                    }
                },
                client: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }

            }
        });

        const response = {
            totalOrders: orders.length,
            orders:
                orders.map(order => ({
                    id: order.id,
                    dateOrder: order.dateOrder,
                    status: order.status,
                    client: {
                        id: order.client?.id,
                        email: order.client?.email,
                        name: order.client?.name
                    },
                    product: order.orderItems.map((item) => ({
                        productId: item.product?.id,
                        productName: item.product?.name,
                        productPrice: item.product?.price,
                        quantity: item.quantity

                    })),
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3100/orders/' + order.id,
                        comment: 'Click to see the order detail !'
                    }
                }))

        }
        res.status(200).json(response);

    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
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
        const productId = req.body.productId;
        let quantity = req.body.quantity

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

        if (quantity === undefined) {
            quantity = 1
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id: productId },
        });
        if (!existingProduct) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }



        const existingOrderItem = await prisma.orderItem.findFirst({
            where: {
                orderId: parsedOrderId,
                productId: productId
            }
        });

        if (existingOrderItem) {
            await prisma.orderItem.update({
                where: {
                    id: existingOrderItem.id
                },
                data: {
                    quantity: existingOrderItem.quantity + quantity
                },
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
                    quantity: existingOrderItem.quantity + quantity,
                    orderId: parsedOrderId
                },
                request: {
                    type: 'GET',
                    url: "http://localhost:3100/orders/" + String(parsedOrderId),
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
                            id: true,
                            name: true,
                            price: true,
                        }
                    }
                }
            });

            res.status(201).json({
                message: "Order item added!",
                product: {
                    id: newOrderItem.productId,
                    quantity: newOrderItem.quantity,
                    orderId: parsedOrderId
                },
                request: {
                    type: 'GET',
                    url: "http://localhost:3100/orders/" + String(parsedOrderId),
                    comment: "Look at the order details"
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
        const orderId = parseInt(req.params.orderId);

        const quantity = parseInt(req.body.quantity);

        const orderItemToUpdate = await prisma.orderItem.update({
            where: {
                orderId_productId: {
                    orderId: orderId,
                    productId: productId
                }
            },
            data: {
                quantity: quantity
            }
        });
        console.log(orderItemToUpdate.productId);
        console.log(orderItemToUpdate.quantity)
        res.status(201).json({
            message: "Order item updated!",
            product: {
                id: orderItemToUpdate.productId,
                quantity: orderItemToUpdate.quantity,
                orderId: orderId
            },
            request: {
                type: 'GET',
                url: "http://localhost:3100/orders/" + String(orderId),
                comment: "Look at the order details"
            }
        });


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
        const orderId = parseInt(req.params.orderId);

        const existingOrder = prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!existingOrder) {
            return res.status(404).json({ message: `Order with ID ${orderIdrderId} not found.` });
        }


        const orderItemToDelete = await prisma.orderItem.delete({
            where: {
                orderId_productId: {
                    orderId: orderId,
                    productId: productId
                }
            }
        });

        res.status(204).send()
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
