const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');

router.post('/', async (req, res, next) => {
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
                url: "http://localhost:3100/clients",
                comment: "look at all our clients"
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
});

router.get('/', async (req, res, next) => {
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
                        url: 'http://localhost:3100/clients/' + String(client.id),
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
}
);

router.get('/:clientId', async (req, res, next) => {

    try {

        parsedIdClient = parseInt(req.params.clientId);

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

router.delete('/:clientId', async (req, res, next) => {
    try {
        const parsedIdClient = parseInt(req.params.clientId);

        const clientToDelete = prisma.client.findUnique({
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
});



module.exports = router