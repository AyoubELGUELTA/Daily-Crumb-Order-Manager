const express = require('express');
const router = express.Router();


const authenticateToken = require('../middlewares/auth.js');

const OrdersControllers = require('../controllers/orders.js');


router.get('/', authenticateToken, OrdersControllers.get_orders);

router.post('/', authenticateToken, OrdersControllers.initialize_order);
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


router.get('/stats', authenticateToken, async (req, res, next) => {

    if (req.user.userRole !== "Admin") {
        return res.status(403).json({ message: "Only Admins can have access to the stats" })
    }

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
