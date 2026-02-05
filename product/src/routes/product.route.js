const express = require('express')
const multer = require('multer')
const productController = require('../controllers/product.controller.js')
const createAuthMiddleware = require('../middlewares/auth.middleware.js')
const { createProductValidators } = require('../validators/product.validators.js')


const router = express.Router()

const upload = multer({ storage: multer.memoryStorage() })

// POST /api/products/
router.post('/' , 
    createAuthMiddleware(["admin" , "seller" , "user"]) , 
    upload.array('images' , 5) , 
    createProductValidators ,
    productController.createProduct
)

router.get('/', 
    productController.getProducts
)


router.patch('/:id' , 
    createAuthMiddleware(["seller"]) , 
    productController.updateProduct
)

router.delete('/:id' , 
    createAuthMiddleware(["seller"]) , 
    productController.deleteProduct
)

// when there are two routes similar routes like GET /api/products/:id and GET /api/products/seller , put the specific one /seller first and then the general one :id
// in the sequence of route declaration matters otherwise /seller will be treated as id = 'seller'
router.get('/seller' , 
    createAuthMiddleware(["seller"]) ,
    productController.getProductsBySeller)

router.get('/:id' , productController.getProductbyId)

module.exports = router
