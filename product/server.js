require('dotenv').config()
const app = require('./src/app.js')
const connectDB = require('./src/db/db.js')

//connect to database
connectDB()

//start the server

app.listen( 3001, () => {
    console.log('Product service is running on port 3001')
})