const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');

const { stringDateToJavaDate, JavaDateToStringDate, isValidDateFormat, isDeliveringDateBeforeToday } = require('./dateUtils.js');

const { startOfDay, addDays } = require('date-fns');
const { start } = require('repl');

const ENUMS_ORDERS_STATUS = ["PREPARED", "INITIALIZED", "SHIPPED", "DELIVERED"]
// const testDate = '12/12/2025';
// const testDateConverted = dateInputConverter(testDate);
// console.log(testDateConverted);

router.get('/', async (req, res, next) => {
    try {

        const { time, planned, id, clientId, productId, status } = req.query;
        let whereClause = {};


        const queryParamsCount = [time, planned, id, status, productId, clientId].filter(param => param !== undefined).length;
        if (queryParamsCount > 0) {

            if (time !== undefined && id !== undefined || planned !== undefined && id !== undefined) {
                return res.status(400).json({ error: "Please, send a single request between time/planned and id query, not id with one of the other at the same time." })
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
                        deliveringDate: JavaDateToStringDate(singleOrder.deliveringDate),
                        paidAt: JavaDateToStringDate(singleOrder.paidAt),
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


                whereClause.deliveringDate = {
                    gte: today,
                    lt: tomorrow
                };
            }




            if (planned !== undefined && !isValidDateFormat(planned)) {

                return res.status(400).json({ message: "Please, enter a valid query for 'planned' value, in the dd/mm/yyy format." })
            }
            else if (planned !== undefined) {
                const plannedDate = stringDateToJavaDate(planned);
                const plannedDayStart = startOfDay(plannedDate);
                const nextPlannedDayStart = addDays(plannedDayStart, 1);

                whereClause.dateOrder = {
                    gte: plannedDayStart,
                    lt: nextPlannedDayStart
                };


            }

            if (clientId) {
                parsedClientId = parseInt(clientId);

                if (!Number.isInteger(parsedClientId)) {
                    return res.status(400).json({ error: "Incorrect value for clientId was passed, please enter a valid Int number." })
                }
                const clientQuery = await prisma.client.findUnique({
                    where: { id: parsedClientId }
                });

                if (!clientQuery) {
                    return res.status(404).json({ error: "clientId passed in query was not found in the database, please re-check your clientId." })
                }

                whereClause.clientId = parsedClientId;

            };

            if (productId) {
                parsedProductId = parseInt(productId);

                if (!Number.isInteger(parsedProductId)) {
                    return res.status(400).json({ error: "Incorrect value for productId was passed, please enter a valid Int number." })
                }
                const productQuery = await prisma.product.findUnique({
                    where: { id: parsedProductId }
                });

                if (!productQuery) {
                    return res.status(404).json({ error: "productId passed in query was not found in the database, please re-check your clientId." })
                }

                whereClause.orderItems = {
                    some: {
                        productId: parsedProductId
                    }
                }

            };

            if (status) {
                if (!ENUMS_ORDERS_STATUS.includes(status)) {
                    return res.status(400).json({ error: "Please, enter a valid status among this list: ['PREPARED', 'INITIALIZED', 'SHIPPED', 'DELIVERED']" })
                }

                whereClause.status = status;

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
                    dateOrder: JavaDateToStringDate(order.dateOrder),
                    deliveringDate: JavaDateToStringDate(order.deliveringDate),
                    paidAt: JavaDateToStringDate(order.paidAt),
                    status: order.status,
                    client: {
                        id: order.client?.id,
                        email: order.client?.email,
                        name: order.client?.name
                    },
                    products: order.orderItems.map((item) => ({
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
        return res.status(200).json(response);

    }

    catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});














router.post('/', async (req, res, next) => {

    try {

        const parsedClientid = parseInt(req.body.clientId)
        const dateToDeliver = req.body.deliveringDate;

        if (!isValidDateFormat(dateToDeliver)) {
            return res.status(400).json({ error: "Please, enter a valid delivering date, in the dd/mm/yyyy format." })
        }

        if (isDeliveringDateBeforeToday(stringDateToJavaDate(dateToDeliver))) {
            return res.status(400).json({ error: "DeliveringDate entered is before today, impossible." })
        }

        const order = await prisma.order.create({
            data: {
                clientId: parsedClientid,
                deliveringDate: stringDateToJavaDate(dateToDeliver)
            }
        });

        res.status(201).json({
            order: {
                clientId: order.clientId,
                deliveringDate: dateToDeliver
            },
            message: "(empty) order created!",
            request: {
                type: 'GET',
                url: 'http://localhost:3100/orders',
                comment: 'Get all orders, or specific order with the ?id=value query, or orders that need to be delivered today with ?time=today query'
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
        const productId = parseInt(req.body.productId);

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



        const existingOrderItem = await prisma.orderItem.findUnique({
            where: {
                orderId_productId: {
                    orderId: parsedOrderId,
                    productId: productId
                }
            }
        });

        if (existingOrderItem) {
            await prisma.orderItem.update({
                where: {
                    orderId_productId: {
                        orderId: parsedOrderId,
                        productId: productId
                    }
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


router.patch('/:orderId', async (req, res, next) => {
    try {

        const parsedOrderId = parseInt(req.params.orderId);
        if (!parsedOrderId) {
            return res.status(500).json({ message: "Choose what order you want to update." })
        }
        const { status, deliveringDate } = req.body;
        if (!status && !deliveringDate) {
            return res.status(400).json({ error: "Please, choose at least one input between status and the deliveringDate you want to update." })
        }

        const updateData = {};

        if (status !== undefined) {
            updateData.status = status;

            if (updateData.status === 'PREPARED') {
                const today = new Date();
                console.log(today)
                updateData.paidAt = today
            }

        }



        let javaDeliveringDate = undefined;



        if (deliveringDate !== undefined) {
            if (!isValidDateFormat(deliveringDate)) {
                return res.status(400).json({ error: "Please, enter a valide delivering date, in the dd/mm/yyyy format." })
            }
            javaDeliveringDate = stringDateToJavaDate(deliveringDate);

            if (!javaDeliveringDate) {
                return res.status(400).json({ error: "Provided delivering date could not be parsed (into real java date)." })
            }

            if (isDeliveringDateBeforeToday(javaDeliveringDate)) {
                return res.status(400).json({ error: "DeliveringDate entered is before today, impossible to update." });
            }

            updateData.deliveringDate = javaDeliveringDate;

        }


        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No valid entry provided to patch the order. (Nor status and deliveringDate)." })
        }
        const orderToUpdate = await prisma.order.update({
            where: {
                id: parsedOrderId
            },
            data: updateData
        });
        res.status(200).json({
            message: "Order updated!",
            order: {
                id: orderToUpdate.id,
                deliveringDate: JavaDateToStringDate(orderToUpdate.deliveringDate),
                status: orderToUpdate.status,
                clientId: orderToUpdate.clientId
            },
            request: {
                type: 'GET',
                url: "http://localhost:3100/orders?id=" + String(parsedOrderId),
                comment: "Look at the order details"
            }
        });


    }

    catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/stats', async (req, res, next) => {
    try {
        const { fromPeriod, toPeriod, popularProducts, sales } = req.query;
        let whereClause = {};


        const queryParamsCount = [fromPeriod, toPeriod].filter(param => param !== undefined).length;
        if (queryParamsCount === 1 && (fromPeriod || toPeriod)) {
            res.status(400).json({ error: "Please, enter two queries to determinate a period duration (you can also put the same date in both fields times to know the number of orders in this day" })
        }
        if (queryParamsCount > 1) {

            if (fromPeriod && toPeriod)
                if (!isValidDateFormat(fromPeriod) || !isValidDateFormat(toPeriod)) {
                    res.status(400).json({ error: "Date provided does not fulfill the dd/mm/yyyy format, please try again respecting this format." })
                }

            const startPeriod = stringDateToJavaDate(fromPeriod);
            const endPeriod = stringDateToJavaDate(toPeriod);

            startPeriod.setHours(0, 0, 0, 0);
            endPeriod.setHours(23, 59, 59, 9999);
            if (!startPeriod || !endPeriod) {
                res.status(400).json({ error: "Date provided could not be interpreted as java date." })
            };

            if (!sales) {
                whereClause.deliveringDate = {
                    gte: startPeriod,
                    lt: endPeriod
                };

                const nbOfOrders = await prisma.order.count({
                    where: whereClause
                });

                return res.status(200).json({
                    filter: `From ${fromPeriod} to ${toPeriod}`,
                    count: nbOfOrders
                })
            }
            if (sales === 'true' || 'True' || 'TRUE') {
                const paidOrdersInPeriod = await prisma.order.findMany({
                    where: {
                        paidAt: {
                            gte: startPeriod,
                            lt: endPeriod
                        }
                    },
                    include: {
                        orderItems: {
                            include: {
                                product: {
                                    select: {
                                        price: true
                                    }
                                }
                            }
                        }
                    }
                })

                let totalRevenue = 0;

                paidOrdersInPeriod.forEach(order => {
                    order.orderItems.forEach(item => {
                        if (item.product && typeof item.product.price === 'number') {
                            totalRevenue += item.quantity * item.product.price
                        }
                    })
                })

                return res.status(200).json({
                    message: `The total revenue from ${JavaDateToStringDate(startPeriod)} to ${JavaDateToStringDate(endPeriod)}.`,
                    totalRevenue: totalRevenue
                })
            }




            if (popularProducts) {
                const popProducts = parseInt(popularProducts)

                if (!Number.isInteger(popProducts)) {
                    return res.status(400).json({ error: "Invalid entry for popularProducts, please enter a int number." })
                }

                if (popProducts < 1) {
                    return res.status(400).json({ error: "Please, enter an integer equal or more than 1." })
                }

                console.log(popProducts);

                const popularProductsSorted = await prisma.orderItem.groupBy({
                    by: ['productId'],
                    _sum: {
                        quantity: true
                    },
                    orderBy: {
                        _sum: {
                            quantity: 'desc'
                        }
                    },
                    take: popProducts
                })

                const productIds = popularProductsSorted.map(item => item.productId)
                console.log(productIds)
                const productDetails = await prisma.product.findMany({
                    where: {
                        id: {
                            in: productIds
                        }
                    },
                    select: {
                        id: true,
                        name: true,
                        price: true
                    }
                });

                const formattedPopularProducts = popularProductsSorted.map(item => {
                    const product = productDetails.find(product => product.id === item.productId)

                    return {
                        productId: item.productId,
                        productName: product ? product.name : "Unknown product",
                        productPrice: product ? product.price : null,
                        totalQuantityOrdered: item._sum.quantity,

                    }
                })

                return res.status(200).json({
                    listPopProductIds: productIds,
                    popularProducts: formattedPopularProducts
                })

            }
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
})





module.exports = router;
