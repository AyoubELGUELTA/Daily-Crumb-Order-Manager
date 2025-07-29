const express = require('express')
const router = express.Router();

const authenticateToken = require('../middlewares/auth');

const ProductsControllers = require('../controllers/products');

const multer = require('multer');

const fileType = require('file-type');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '../uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
    }
});

const fileFilter = async (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    }
    else {
        cb(new Error('Not a png or jpeg file, try again.'), false);
    }
}
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 },
    fileFilter: fileFilter
})


router.get('/', ProductsControllers.get_product);

router.get('/:productId', ProductsControllers.get_single_product);



router.post('/', authenticateToken, ProductsControllers.post_new_product);

router.post('/:productId/images', authenticateToken, upload.single('productImages', async (req, res, next) => {
    const productId = parseInt(req.params.productId);

    const uploadedFile = req.file;

    if (!uploadedFile) {
        return res.status(400).json({ message: "Image file was not given." })
    }

    try {

        const detectedType = await fileType.fromFile(uploadedFile.path);

        if (!detectedType || (detectedType.mime !== 'image/jpeg' && detectedType.mime !== 'image/png')) {
            await fs.unlink(uploadedFile.path);
            return res.status(400).json({ message: 'Type de fichier non supporté. Seules les images JPEG et PNG sont autorisées.' });
        }

        const imageUrl = uploadedFile.path.replace(/\\/g, '/'); // Assurer un chemin URL-friendly
        const { isMain, altText, order } = req.body;

        if (!isMain) {
            const existingProductImage

        }

        const newProductImage = await prisma.productImage.create({
            data: {
                url: imageUrl,
                productId: productId,
                isMain: isMain || false,


            }
        })

    }

    catch (error) {

    }

}))

router.delete('/:productId', authenticateToken, ProductsControllers.delete_product);

router.patch('/:productId', authenticateToken, ProductsControllers.update_product);


module.exports = router;
