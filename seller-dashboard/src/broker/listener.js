const { subscribeToQueue } = require('./broker.js')
const userModel = require('../models/user.model.js')
const productModel = require('../models/product.model.js')

module.exports = async function () {

    subscribeToQueue('AUTH_SELLER_DASHBOARD.USER_CREATED' , async (user) => {
        
        await userModel.create(user)

    })

    subscribeToQueue('PRODUCT_SELLER_DASHBOARD.PRODUCT_CREATED' , async (product) => {
        
        await productModel.create(product)

    })

}