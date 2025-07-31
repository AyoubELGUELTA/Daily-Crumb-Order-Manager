
const prisma = require('../../prismaClient.js');

const { stringDateToJavaDate, JavaDateToStringDate, isValidDateFormat, isDeliveringDateBeforeToday } = require('../utils/dateUtils.js');

const { startOfDay, addDays } = require('date-fns');


const ENUMS_ORDERS_STATUS = ["PREPARED", "INITIALIZED", "SHIPPED", "DELIVERED"]

exports.get_orders = async (req, res, next) => {
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
                            url: process.env.BASE_URL + '/orders/' + singleOrder.id,
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
                        url: process.env.BASE_URL + '/orders/' + order.id,
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
}

exports.initialize_order = async (req, res, next) => {
    try {

        const parsedClientId = parseInt(req.body.clientId)
        const dateToDeliver = req.body.deliveringDate;

        if (isNaN(parsedClientId)) {
            return res.status(400).json({ error: "Invalid client ID. Must be a valid integer." });
        }

        const clientExists = await prisma.client.findUnique({
            where: { id: parsedClientId }
        });
        if (!clientExists) {
            return res.status(404).json({ error: `Client with ID ${parsedClientId} not found.` });
        }

        if (!isValidDateFormat(dateToDeliver)) {
            return res.status(400).json({ error: "Please, enter a valid delivering date, in the dd/mm/yyyy format." })
        }

        if (isDeliveringDateBeforeToday(stringDateToJavaDate(dateToDeliver))) {
            return res.status(400).json({ error: "DeliveringDate entered is before today, impossible." })
        }

        const order = await prisma.order.create({
            data: {
                clientId: parsedClientId,
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
                url: process.env.BASE_URL + '/orders',
                comment: 'Get all orders, or specific order with the ?id=value query, or orders that need to be delivered today with ?time=today query'
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }


};


exports.post_item_order = async (req, res, next) => {

    try {
        const parsedOrderId = parseInt(req.params.orderId);
        const productId = req.body.productId;
        let quantity = req.body.quantity

        if (isNaN(parsedOrderId)) {
            return res.status(400).json({ message: 'Invalid order ID. Must be a number.' });
        }
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID. Must be a number.' });
        }

        const existingOrder = await prisma.order.findUnique({
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
            quantity = parsedQuantity
        } else {
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
                    url: process.env.BASE_URL + "/orders/" + String(parsedOrderId),
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
                    url: process.env.BASE_URL + "/orders/" + String(parsedOrderId),
                    comment: "Look at the order details"
                }
            })

        }

    }

    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.update_item_order = async (req, res, next) => {

    try {

        const productId = parseInt(req.body.productId);

        const orderId = parseInt(req.params.orderId);

        const quantity = parseInt(req.body.quantity);

        if (isNaN(parsedOrderId)) {
            return res.status(400).json({ message: 'Invalid order ID. Must be a number.' });
        }
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID. Must be a number.' });
        }

        if (isNaN(quantity)) {
            return res.status(400).json({ message: 'Invalid quantity passed. Must be a number.' });
        }

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

        res.status(201).json({
            message: "Order item updated!",
            product: {
                id: orderItemToUpdate.productId,
                quantity: orderItemToUpdate.quantity,
                orderId: orderId
            },
            request: {
                type: 'GET',
                url: process.env.BASE_URL + "/orders/" + String(orderId),
                comment: "Look at the order details"
            }
        });


    }

    catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.delete_item_order = async (req, res, next) => {

    try {

        const productId = parseInt(req.body.productId);

        const orderId = parseInt(req.params.orderId);

        if (isNaN(parsedOrderId)) {
            return res.status(400).json({ message: 'Invalid order ID. Must be a number.' });
        }
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID. Must be a number.' });
        }

        const existingOrder = await prisma.order.findUnique({
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
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Order item not found for the given Order ID and Product ID." });
        }
        res.status(500).json({ error: error.message });
    }
};


exports.get_stats = async (req, res, next) => {

    try {
        const { fromPeriod, toPeriod, popularProducts, sales } = req.query;
        let whereClause = {};


        const A_statsQueryParamsFilter = [fromPeriod, toPeriod, popularProducts].filter(param => param !== undefined).length;
        if (A_statsQueryParamsFilter < 2 && (fromPeriod || toPeriod)) {
            return res.status(400).json({ error: "Please, enter two queries to determinate a period duration (you can also put the same date in both fields times to know the number of orders in this day" })
        }
        else if (A_statsQueryParamsFilter > 1 && popularProducts) {
            return res.status(400).json({ error: "Please, you cannot put period requests with poopular Product request." })
        }

        const B_statsQueryParamsFilter = [popularProducts, sales].filter(param => param !== undefined);
        if (B_statsQueryParamsFilter.length > 1) {
            return res.status(400).json({ error: "Please, request only one type of stats at a time (popularProducts OR sales)." });
        }




        if (fromPeriod && toPeriod)
            if (!isValidDateFormat(fromPeriod) || !isValidDateFormat(toPeriod)) {
                res.status(400).json({ error: "Date provided does not fulfill the dd/mm/yyyy format, please try again respecting this format." })
            }

        const startPeriod = startOfDay(stringDateToJavaDate(fromPeriod));
        const endPeriod = addDays(startOfDay(stringDateToJavaDate(toPeriod)), 1);

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
        if (['true', 'True', 'TRUE'].includes(sales)) {
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
    catch (error) {
        res.status(500).json({ error: error.message })
    }
}



