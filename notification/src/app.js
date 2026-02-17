const express = require('express')
const { connect } = require('./broker/broker.js')


const app = express()

connect() // Connect to RabbitMQ server when the application starts

// Creating a simple route to test if the server is running
// or create a health check route/endpoint for monitoring purposes
app.get('/', (req, res) => {
    res.send('Notification service is up and running')
})

module.exports = app
