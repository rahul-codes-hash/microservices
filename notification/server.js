require('dotenv').config()
const app = require('./src/app.js')

app.listen('3006', () => {
    console.log('Notification service is running on port 3006')
})