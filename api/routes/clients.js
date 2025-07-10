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
                name: req.body.name || none
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


module.exports = router