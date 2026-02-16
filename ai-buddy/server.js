require('dotenv').config()
const app = require('./src/app.js')
const { initSocketServer } = require('./src/sockets/socket.server.js')
const http = require('http')

const httpServer = http.createServer(app)

initSocketServer(httpServer)

httpServer.listen(3005, () => {
    console.log('AI Buddy is running on port 3005');
})
