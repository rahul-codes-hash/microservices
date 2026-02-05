const express = require('express');
const createAuthMiddleware = require('../middlewares/auth.middleware.js')
const cartController = require("../controllers/cart.controller.js")
const validation = require('../middlewares/validation.middleware.js')

const router = express.Router()

router.post("/items",
    validation.validateAddItemToCart,
    createAuthMiddleware(["user"]) ,
    cartController.addItemToCart
    )

module.exports = router