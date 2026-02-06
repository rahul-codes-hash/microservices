const mongoose = require('mongoose')

async function connectDB(){
try{
await mongoose.connect(process.env.MONGO_URI, () => {
    console.log('connected to db successfully')
})
} catch(err){
    console.log('error connecting to db', err)
}
}

module.exports = connectDB
