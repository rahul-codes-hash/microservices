const express = require('express');
const cookieParser = require('cookie-parser');  

const app = express();
app.use(express.json());
app.use(cookieParser());  // Middleware to parse cookies


app.get('/', (req, res) => {
    res.status(200).json({ message: 'Auth Service is running.' });
})

const authRoutes = require('./routes/auth.routes.js');

app.use('/api/auth', authRoutes);


module.exports = app;