const cookieParser = require('cookie-parser')
const express = require('express')
const productRoutes = require('./routes/product.route.js')

const app = express()

//middlewares
app.use(cookieParser())
app.use(express.json())

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Product Service is running.' })
})

/* POST /api/products */
app.use('/api/products' , productRoutes)

module.exports = app