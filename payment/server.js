require('dotenv').config()
const app = require('./src/app.js')
const connectDB = require('./src/db/db.js')
const { connect } = require('./src/broker/broker.js')

connectDB()

connect()

app.listen(3004, () => {
console.log('Payment service is running on port 3004')
})