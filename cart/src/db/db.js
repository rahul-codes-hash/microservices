const mongoose = require('mongoose')

async function connectDB (){
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to the Database')
  } catch (err) {
    console.error("Error connecting to the Database:" , err)
  }
}

module.exports = connectDB