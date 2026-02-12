const mongoose = require('mongoose')

async function connectDB() {

        try{
            mongoose.connect(process.env.MONGO_URI)
            console.log('Connected to MongoDB successfully')
        }catch(error){
            console.error('Error connecting to MongoDB:', error)
        }


}

module.exports = connectDB