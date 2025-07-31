
const prisma = require('../../prismaClient.js');

const { stringDateToJavaDate, JavaDateToStringDate, isValidDateFormat, isDeliveringDateBeforeToday } = require('../utils/dateUtils.js');


exports.create_new_client = async (req, res, next) => {
    try {
        const newClient = await prisma.client.create({
            data: {
                email: req.body.email,
                name: req.body.name || "Unknown"
            }
        });

        res.status(201).json({
            message: "New client created!",
            client: newClient,
            request: {
                type: 'GET',
                url: process.env.BASE_URL + "/clients",
                comment: "look at all our clients"
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
};


exports.get_client = async (req, res, next) => {
    try {
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true
            }
        })
        const response = {
            total: clients.length,
            clients:
                clients.map(client => ({
                    email: client.email,
                    name: client.name,
                    createdAt: client.createdAt,
                    request: {
                        type: 'GET',
                        url: process.env.BASE_URL + '/clients/' + String(client.id),
                        comment: 'Look at the client orders!'
                    }
                })
                )

        };
        // res.status(200).json({ message: 'Handling Get all product successfully' });

        res.status(200).json(response)
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
};



exports.get_client_orders = async (req, res, next) => {
    try {

        parsedIdClient = parseInt(req.params.clientId);
        if (isNaN(parsedIdClient)) {
            return res.status(400).json({ message: 'L\'ID du client doit être un nombre valide.' });
        }
        const orders = req.query.history;

        if (orders === "all") {

            const allClientOrders = await prisma.order.findMany({
                where: { clientId: parsedIdClient },

                include: {
                    client: {
                        select: {
                            id: true,
                            email: true
                        }

                    },
                    orderItems: {
                        select: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    price: true
                                }
                            },
                            quantity: true
                        }
                    }
                },
                orderBy: {
                    deliveringDate: 'asc'
                }
            })

            const response = {
                totalOrders: allClientOrders.length,
                allClientOrders: allClientOrders.map(order => ({
                    id: order.id,
                    dateOrder: order.dateOrder,
                    deliveringDate: JavaDateToStringDate(order.deliveringDate),
                    status: order.status,
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

            return res.status(200).json(response)
        }


        const client = await prisma.client.findUnique({
            where: { id: parsedIdClient },
            include: {
                _count: {
                    select: {
                        orders: true
                    }
                }
            }
        });

        if (!client) {
            return res.status(404).json({ error: "Client not found, try another id." })
        };

        const response = {
            client: {
                id: client.id,
                email: client.email,
                name: client.name,
                createdAt: client.createdAt,
                totalOrders: client._count.orders
            },
            request: {
                type: 'GET',
                url: process.env.BASE_URL + '/orders',
                comment: 'look at all orders'
            }
        }
        // res.status(200).json({ message: 'Handling Get a specific product successfully' });

        res.status(200).json(response);

    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};



exports.delete_client = async (req, res, next) => {
    try {
        const parsedIdClient = parseInt(req.params.clientId);
        if (isNaN(parsedIdClient)) {
            return res.status(400).json({ message: 'L\'ID du client doit être un nombre valide.' });
        }
        const clientToDelete = await prisma.client.findUnique({
            where: { id: parsedIdClient }
        });

        if (!clientToDelete) {
            res.status(404).json({ message: "Client not found." })
        }

        await prisma.client.delete({
            where: { id: parsedIdClient }
        })

        res.status(204).send()
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
};