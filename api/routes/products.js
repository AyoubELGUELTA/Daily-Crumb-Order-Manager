const express = require('express')
const router = express.Router();

const authenticateToken = require('../middlewares/auth');

const ProductsControllers = require('../controllers/products');

const multer = require('multer');
const checkAdminRole = require('../middlewares/checkAdmin');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './api/uploads/');
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



router.post('/', authenticateToken, checkAdminRole, ProductsControllers.post_new_product);

router.delete('/:productId', authenticateToken, checkAdminRole, ProductsControllers.delete_product);

router.patch('/:productId', authenticateToken, checkAdminRole, ProductsControllers.update_product);


router.post('/:productId/images', authenticateToken, checkAdminRole, upload.single('productImage'), ProductsControllers.post_new_image_product);

router.delete('/:productId/images/:imageId', authenticateToken, checkAdminRole, ProductsControllers.delete_image_product);


module.exports = router;
