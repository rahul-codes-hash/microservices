const express = require('express')
const { connect, subscribeToQueue } = require('./broker/broker.js')
const setListeners = require('./broker/listeners.js')




const app = express()

// Connect to RabbitMQ server when the application starts
connect() .then(() => {
setListeners() // Set up the listeners for the queues
})

// Creating a simple route to test if the server is running
// or create a health check route/endpoint for monitoring purposes
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Notification Service is running.' })
})


module.exports = app
