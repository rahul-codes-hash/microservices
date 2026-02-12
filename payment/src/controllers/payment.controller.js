const paymentModel = require('../models/paymentModel.js')
const Razorpay = require('razorpay');

require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function createPayment(req, res) {

    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];
try {

    const orderId = req.params.orderId

    const orderResponse = await axios.get(`http://localhost:3003/api/orders/${orderId}` , {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    const price = orderResponse.data.order.totalPrice

 const order = await razorpay.orders.create(price)
 
 const payment = new paymentModel.create({
    order: orderId , // Store the order ID from the orders service
    razorpayOrderId: order.id , // Store the Razorpay order ID for reference
    user: req.user.id ,
    price: {
        amount: order.amount ,
        currency: order.currency
    }
 })

 return res.status(201).json({
    message: 'Payment initialized successfully' , payment })

}catch(error){
console.error('Error creating payment:', error)
res.status(500).json({message: 'Internal server error'})
}}

async function verifyPayment(req, res) {

    const { razorpayPaymentId , razorpayOrderId , signature } = req.body
    const secret = process.env.RAZORPAY_KEY_SECRET

    try{

            const { validatePaymentVerification } = require('../../node_modules/razorpay/dist/utils/razorpay-utils.js')

            const isValid = validatePaymentVerification({
                order_id: razorpayOrderId ,
                payment_id: paymentId
            } , signature , secret)

            if(!isValid){
                return res.status(400).json({message: 'Invalid payment signature'})
            }

            const payment = await paymentModel.findOne({ razorpayOrderId ,status: 'PENDING' })

            if(!payment){
                return res.status(404).json({message: 'Payment not found'})
            }

            payment.paymentId = paymentId
            payment.signature = signature
            payment.status = 'COMPLETED'

            await payment.save()

            res.status(200).json({message: 'Payment verified successfully' , payment })

    } catch(error){
        console.error('Error verifying payment:', error)
        res.status(500).json({message: 'Internal server error'})
    }

}


module.exports = {
    createPayment ,
    verifyPayment
}