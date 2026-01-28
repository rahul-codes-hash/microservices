require('dotenv').config()
const app = require('./src/app.js');
const connectDB = require('./src/db/db.js');


connectDB()



app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

    // "test": "echo \"Error: no test specified\" && exit 1",
