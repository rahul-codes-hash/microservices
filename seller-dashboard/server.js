require('dotenv').config()

const app = require('./src/app.js')
const connectDB = require('./src/db/db.js')
const listener = require('./src/broker/listener.js')
const { connect } = require('./src/broker/broker.js')

connectDB()

connect().then(() => {
    console.log("Connected to RabbitMQ successfully")
    listener()
}).catch((error) => {
    console.error("Error connecting to RabbitMQ:", error)
    process.exit(1)
})

app.listen(3007 , () => {
    console.log('Seller Dashboard Service is running on port 3007')
})