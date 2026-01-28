const express = require('express')
const multer = require('multer')
const productController = require('../controllers/product.controller.js')
const createAuthMiddleware = require('../middlewares/auth.middleware.js')
const { createProductValidators } = require('../middlewares/product.validators.js')


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

)


module.exports = router
