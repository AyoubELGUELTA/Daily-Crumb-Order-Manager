const fs = require('fs');
const path = require('path');

const express = require('express');
const router = express.Router();

const prisma = require('../../prismaClient.js');
const authenticateToken = require('../middlewares/auth.js');

router.get('/', async (req, res, next) => {
    try {

        const products = await prisma.product.findMany({
            select: {
                id: true,
                name: true,
                price: true,
                inStock: true,
            }
        });

        const response = {
            total: products.length,
            products:
                products.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    request: {
                        type: 'GET',
                        url: 'http://localhost:3100/products/' + product.id
                    }
                })
                )

        };
        // res.status(200).json({ message: 'Handling Get all product successfully' });

        res.status(200).json(response)
    }

    catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/:productId', async (req, res, next) => {

    try {
        const product = await prisma.Product.findUnique({
            where: { id: parseInt(req.params.productId) }
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found, try another id." })
        };

        const response = {
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                inStock: product.inStock
            },
            request: {
                type: 'GET',
                url: 'http://localhost:3100/products',
                comment: 'look at all products'
            }
        }
        // res.status(200).json({ message: 'Handling Get a specific product successfully' });

        res.status(200).json(response);

    }
    catch (error) {
        res.status(500).json({ error: error });
    }
})

router.post('/', authenticateToken, async (req, res, next) => {
    if (req.user.userRole !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can delete users' });
    }
    try {

        const product = await prisma.product.create({
            data: {
                name: req.body.name,
                price: req.body.price,
                inStock: req.body.inStock || false
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
        res.status(500).json({ error: error.message })
    }


});

router.delete('/:productId', async (req, res, next) => {
    if (req.user.userRole !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can delete users' });
    }
    try {

        const productId = parseInt(req.params.productId)

        if (isNaN(productId)) {
            return res.status(400).json({
                message: 'Invalid product ID. Please provide a valid number.'
            });
        }

        const productToDelete = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!productToDelete) {
            return res.status(404).json({ error: `Product with ID ${productId} not found.` })
        };

        await prisma.product.delete({
            where: {
                id: productId,
            },
        });

        res.status(204).send();

    }

    catch (error) {
        res.status(500).json({ error: error.message })
    };

});

router.patch('/:productId', async (req, res, next) => {
    if (req.user.userRole !== 'Admin') {
        return res.status(403).json({ message: 'Only admins can delete users' });
    }
    try {

        const productId = parseInt(req.params.productId)

        if (isNaN(productId)) {
            return res.status(400).json({
                message: 'Invalid product ID. Please provide a valid number.'
            });
        };

        const updateData = {};
        const allowFields = ['name', 'price', 'inStock'];
        for (const field of allowFields) {
            if (req.body[field] !== undefined) {
                if (field === 'price') {
                    const parsedPrice = parseFloat(req.body[field]);
                    updateData[field] = parsedPrice;
                }
                else if (field === 'inStock') {
                    updateData[field] = req.body[field] || false
                }
                else {
                    updateData[field] = req.body[field];
                }

            };

            if (Object.keys(updateData).length === 0) {
                res.status(400).json({ message: "No field(s) or no valid field(s) provided for update." })
            }


            const updatedProduct = await prisma.product.update({
                where: { id: productId },
                data: updateData
            })

            res.status(200).json({
                message: 'Product updated successfully.',
                product: updatedProduct,
                request: {
                    type: 'GET',
                    url: `http://localhost:3100/products/${updatedProduct.id}`,
                    comment: 'Get all info of this product!'
                }
            });

        }
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
});


module.exports = router;
