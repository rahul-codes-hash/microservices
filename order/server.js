const app = require('./src/app.js')
const connectDB = require('./src/db/db.js')

require('dotenv').config()


connectDB()

app.listen(3003 , () => {
    console.log('Order Service is running on port 3003')    
})
