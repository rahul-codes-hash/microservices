const express = require('express')
const cookieParser = require('cookie-parser')
const orderRoutes = require('./routes/order.routes.js')



app.use(express.json())
app.use(cookieParser())

app.use('/api/orders' , orderRoutes)

const app = express()

module.exports = app