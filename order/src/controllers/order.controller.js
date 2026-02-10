const orderModel = require('../models/order.model.js');
const axios = require('axios');

async function createOrder(req, res) {

    const user = req.user; // Assuming the auth middleware sets req.user
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

    try {

        const cartResponse = await axios.get('http://localhost:3002/api/cart', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
       
            const products = await Promise.all(cartResponse.data.cart.items.map(async (item) => { 

                return (await axios.get(`http://localhost:3001/api/products/${item.productId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })).data.data
             }))

                let priceAmount = 0

                const orderItems = cartResponse.data.cart.items.map((item, index) => {
                    
                    const product = products.find(p => p._id === item.productId)

                    // if not in stock, does not allow order creation
                    if(product.inStock < item.quantity) {
                        throw new Error(`Product ${product.title} is out of stock or does not have enough quantity available`)
                    }

                    const itemTotal = product.price.amount * item.quantity
                    priceAmount += itemTotal

                    return {
                        product: item.productId,
                        quantity: item.quantity,
                        price: {
                            amount: itemTotal,
                            currency: product.price.currency
                        }
                    }
                })


                const tax = priceAmount * 0.1; // Example tax calculation (10%)
                const shipping = 5.00; // Flat shipping fee for example

                const order = await orderModel.create({
                    user: user.id,
                    items: orderItems,
                    status: 'PENDING',
                    totalPrice: {
                        amount: priceAmount ,
                        currency: 'INR' // Assuming all items have the same currency
                    },
                    shippingAddress: {
                        street: req.body.shippingAddress.street,
                        city: req.body.shippingAddress.city,
                        state: req.body.shippingAddress.state,
                        pincode: req.body.shippingAddress.pincode,
                        country: req.body.shippingAddress.country
                    } // Assuming shipping address is included in the cart response
                });

                res.status(201).json(order)
        
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ message: 'Internal server error' });
    }

}

async function getMyOrders(req, res) {

    const user = req.user; // Assuming the auth middleware sets req.user

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit

    try {
        const orders = await orderModel.find({ user: user.id }).skip(skip).limit(limit).sort({ createdAt: -1 })
        const totalOrders = await orderModel.countDocuments({ user: user.id })
        res.json({
            orders,
            meta: {
                total: totalOrders,
                page,
                limit
            }
        })
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Internal server error' });
    }

}

async function getOrderById(req, res) {

    const user = req.user; // Assuming the auth middleware sets req.user
    const orderId = req.params.id

    try {
        const order = await orderModel.findById(orderId)

        if(!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if(order.user.toString() !== user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this order' })
        }

        res.status(200).json(order)

    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ message: 'Internal server error' });
    }

}

async function cancelOrderById(req, res) {

    const user = req.user; // Assuming the auth middleware sets req.user
    const orderId = req.params.id
    
    try {
        const order = await orderModel.findById(orderId)

        if(!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if(order.user.toString() !== user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this order' })
        }

        if(order.status !== 'PENDING') {
            return res.status(409).json({ message: 'Orders cannot be cancelled at this stage' })
        }

        order.status = 'CANCELLED'
        await order.save()

        res.status(200).json({ order })

    } catch (err) {
        console.error('Error cancelling order:', err);
        res.status(500).json({ message: 'Internal server error' , error: err.message });
    }

}

async function updateOrderAddress(req, res) {

    const user = req.user; // Assuming the auth middleware sets req.user
    const orderId = req.params.id

    try {
        const order = await orderModel.findById(orderId)
        
        if(!order) {
            return res.status(404).json({ message: 'Order not found' })
        }

        if(order.user.toString() !== user.id) {
            return res.status(403).json({ message: 'Forbidden: You do not have access to this order' })
        }

        const { street, city, state, pincode, country } = req.body.shippingAddress

        order.shippingAddress = {
            street,
            city,
            state,
            pincode,
            country
        }

        await order.save()

        res.status(200).json({ order })

    } catch (err) {
        console.error('Error updating order address:', err);
        res.status(500).json({ message: 'Internal server error' , error: err.message });
    }

}

module.exports = {
    createOrder ,
    getMyOrders ,
    getOrderById ,
    cancelOrderById ,
    updateOrderAddress
}