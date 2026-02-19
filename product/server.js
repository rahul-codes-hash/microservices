require('dotenv').config()
const app = require('./src/app.js')
const connectDB = require('./src/db/db.js')
const { connect } = require('./src/broker/broker.js')

//connect to database
connectDB()

//connect to broker
connect()

//start the server

app.listen( 3001, () => {
    console.log('Product service is running on port 3001')
})