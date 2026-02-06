const express = require('express');
const createAuthMiddleware = require('../middlewares/auth.middleware.js')
const cartController = require("../controllers/cart.controller.js")
const validation = require('../middlewares/validation.middleware.js')

const router = express.Router()

router.get("/",
    createAuthMiddleware(["user"]) ,
    cartController.getCart
)

router.post("/items",
    validation.validateAddItemToCart,
    createAuthMiddleware(["user"]) ,
    cartController.addItemToCart
    )

router.patch("/items/:productId",
    validation.validateUpdateCartItem,
    createAuthMiddleware(["user"]) ,
    cartController.updateItemQuantity
)

module.exports = router