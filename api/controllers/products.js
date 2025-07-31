const prisma = require('../../prismaClient.js');
const { fileTypeFromFile } = require('file-type/node');
const fs = require('fs/promises');
const { relative } = require('path');


exports.get_product = async (req, res, next) => {


    try {

        const products = await prisma.product.findMany({
            include: {
                images: {
                    select: {
                        id: true,
                        url: true,
                        isMain: true,
                        altText: true
                    }
                }
            }
        });

        const response = {
            total: products.length,
            products:
                products.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    inStock: product.inStock,
                    images: product.images.map(image => ({
                        id: image.id,
                        url: image.url
                    })),
                    request: {
                        type: 'GET',
                        url: process.env.BASE_URL + '/products/' + product.id
                    }
                })
                )

        };

        res.status(200).json(response)
    }

    catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

exports.get_single_product = async (req, res, next) => {


    try {
        const product = await prisma.product.findUnique({
            where: { id: parseInt(req.params.productId) },
            include: {
                images: {
                    select: {
                        id: true,
                        isMain: true,
                        altText: true,
                        url: true
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found, try another id." })
        };

        const response = {
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                inStock: product.inStock,
                images: product.images.map(image => ({
                    id: image.id,
                    isMain: image.isMain,
                    altText: image.altText,
                    url: image.url
                })),
            },
            request: {
                type: 'GET',
                url: process.env.BASE_URL + '/products',
                comment: 'look at all products'
            }
        }
        // res.status(200).json({ message: 'Handling Get a specific product successfully' });

        res.status(200).json(response);

    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.post_new_product = async (req, res, next) => {

    try {
        const BooleanList = ['True', 'true', 'false', 'False', 'TRUE', 'FALSE']
        inStock = BooleanList.includes(req.body.inStock)

        const product = await prisma.product.create({
            data: {
                name: req.body.name,
                price: req.body.price,
                inStock: inStock || false
            }
        });

        res.status(201).json({
            message: "Product created!",
            product: product,
            request: {
                type: 'GET',
                url: process.env.BASE_URL + '/products/' + product.id,
                comment: 'Get all info of this product!'
            }
        })
    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }


}

exports.post_new_image_product = async (req, res, next) => {

    const productId = parseInt(req.params.productId);

    const uploadedFile = req.file;

    if (!uploadedFile) {
        return res.status(400).json({ message: "Image file was not given." })
    }

    try {

        const detectedType = await fileTypeFromFile(uploadedFile.path);

        if (!detectedType || (detectedType.mime !== 'image/jpeg' && detectedType.mime !== 'image/png')) {
            await fs.unlink(uploadedFile.path);
            return res.status(400).json({ message: 'Type de fichier non supporté. Seules les images JPEG et PNG sont autorisées.' });
        }

        const imageUrl = uploadedFile.path.replace(/\\/g, '/'); // Assurer un chemin URL-friendly
        let { isMain, altText } = req.body;

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        const productName = product.name.replace(' ', '_');

        const existingProductImages = await prisma.productImage.count({
            where: { productId: productId }
        });

        const existingMainImage = await prisma.productImage.findFirst({
            where: {
                productId: productId,
                isMain: true
            }
        })

        if (existingMainImage) {
            if (isMain === "true" || isMain === "True") {
                await fs.unlink(uploadedFile.path)
                return res.status(400).json({ message: "You already assigned a Main image, please remove this latter assignement to place it on this new image." })
            }


        }

        else if (existingProductImages === 0) {
            isMain = true
        }



        if (!altText) {
            altText = "imageProduct-" + productName
        }

        const newProductImage = await prisma.productImage.create({
            data: {
                url: imageUrl,
                isMain: isMain || false,
                altText: altText,
                productId: productId
            },

        })

        res.status(201).json({ message: "New image product added!" })

    }

    catch (error) {
        try {
            await fs.unlink(`api/uploads/${relativePath}`);
        } catch (fileError) {
            if (fileError.code !== 'ENOENT') {// si le code == ENOENT ça veut dire que le fichier/ la requête de l'objet n'a pas été trouvé
                throw fileError;
            } res.status(500).json({ error: error.message })
        }
    }
};

exports.delete_image_product = async (req, res, next) => {
    try {
        const productId = parseInt(req.params.productId);
        const imageId = parseInt(req.params.imageId);

        if (isNaN(productId) || isNaN(imageId)) {
            return res.status(400).json({ message: 'Les IDs de produit et d\'image doivent être des nombres valides.' });

        }

        const imageProductToDelete = await prisma.productImage.findUnique({
            where: {
                id: imageId,
                productId: productId
            }
        });

        if (!imageProductToDelete) {
            return res.status(404).json({ error: "Image not found for this product." })
        }

        const imageUrl = imageProductToDelete.url;

        const relativePath = imageUrl.split('api/uploads/')[1];
        await prisma.productImage.delete({
            where: { id: imageId }
        });

        console.log(relativePath);

        try {
            await fs.unlink(`api/uploads/${relativePath}`);
            res.status(204).send()
        } catch (fileError) {
            if (fileError.code !== 'ENOENT') {// si le code == ENOENT ça veut dire que le fichier/ la requête de l'objet n'a pas été trouvé
                throw fileError;
            }
            console.warn(`Could not delete file: ${relativePath}. It may not exist.`);
        }


    }

    catch (error) {
        res.status(500).json({ error: error.message })
    }

};

exports.delete_product = async (req, res, next) => {

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

        const imagesToDelete = await prisma.productImage.findMany({
            where: { productId: productId }
        });


        let imageUrl = null;

        let relativePath = null;

        for (image of imagesToDelete) {
            imageUrl = image.url;

            relativePath = imageUrl.split('api/uploads/')[1]

            await fs.unlink(`api/uploads/${relativePath}`)
        }

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

};


exports.update_product = async (req, res, next) => {
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
                    if (isNaN(parsedPrice)) {
                        return res.status(400).json({ message: 'Price must be a valid number.' });
                    }
                    updateData[field] = parsedPrice;
                }
                else if (field === 'inStock') {
                    if (req.body[field] !== undefined && !['true', 'True', 'false', 'False'].includes(req.body[field])) {
                        return res.status(400).json({ message: 'inStocke must be a boolean (true/false)' })
                    }
                    updateData[field] = req.body[field] || false
                }
                else {
                    updateData[field] = req.body[field];
                }

            };
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No field(s) or no valid field(s) provided for update." })
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
                url: process.env.BASE_URL + `/products/${updatedProduct.id}`,
                comment: 'Get all info of this product!'
            }
        });


    }
    catch (error) {
        res.status(500).json({ error: error.message })
    }
};