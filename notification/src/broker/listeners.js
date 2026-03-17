const { subscribeToQueue } = require('./broker.js')
const { sendEmail } = require('../email.js')

// This file will contain all the listeners for the queues that we want to subscribe to
// For example, we can have a listener for the "AUTH_NOTIFICATION.USER_CREATED" queue that will listen for any message on it and consume messages from it

module.exports = async function () {

    subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED", async (data) => {
    // Here you can implement the logic to send an email or notification based on the received data
    // For example, you can use nodemailer to send an email notification
    // or integrate with a third-party service like Twilio for SMS notifications

    const emailHTMLTemplate = `
        <h1>Welcome to our service!</h1>
        <p>Dear ${data.fullName.firstName + " " + (data.fullName.lastName || "")},</p>
        <p>Thank you for registering with us. We're excited to have you on board.</p>
        <p>Best regards,<br/>The Team</p>
    `
    await sendEmail(data.email, "Welcome to our service!", "Thank you for registering with us!", emailHTMLTemplate)
})

subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_INITIATED", async (data) => {
    const emailHTMLTemplate = `
        <h1>Payment Initiated!</h1>
        <p>Dear ${data.username},</p>
        <p>Your payment of ${data.currency} ${data.amount} for the orderId ${data.orderId} has been initiated.</p>
        <p>We will notify you once the payment is completed.</p>
        <p>Best regards,<br/>The Team</p>
    `
    await sendEmail(data.email, "Payment Initiated!", "Your payment has been initiated. We will notify you once it's completed.", emailHTMLTemplate)
})

subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {
    const emailHTMLTemplate = `
        <h1>Payment Successful!</h1>
        <p>Dear ${data.username},</p>
        <p>We have received your payment of ${data.currency} ${data.amount} for the orderId ${data.orderId}.</p>
        <p>Your payment has been successfully processed.</p>
        <p>Best regards,<br/>The Team</p>
    `
    await sendEmail(data.email, "Payment Successful!", "Your payment has been successfully processed.", emailHTMLTemplate)
})

subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED" , async (data) => {
    const emailHTMLTemplate = `
        <h1>Payment Failed!</h1>
        <p>Dear ${data.username},</p>
        <p>We regret to inform you that your payment for the orderId ${data.orderId} has failed.</p>
        <p>Please try again or contact our support team for assistance.</p>
        <p>Best regards,<br/>The Team</p>
    `
    await sendEmail(data.email, "Payment Failed!", "Your payment has failed. Please try again.", emailHTMLTemplate) 
})

subscribeToQueue("PRODUCT_NOTIFICATION.PRODUCT_CREATED", async (data) => {
    const emailHTMLTemplate = `
        <h1>New Product Available!</h1>
        <p>Dear ${data.username},</p>
        <p>Check it out and enjoy exclusive launch offers!</p>
        <p>Best regards,<br/>The Team</p>
    `
    await sendEmail(data.email, "New Product Launched!", "Check out our latest products.", emailHTMLTemplate)       



})

}
