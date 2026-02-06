const express = require('express');
const createAuthMiddleware = require('../middlewares/auth.middleware.js');


const router = express.Router();

router.post("/", createAuthMiddleware(['user']))

module.exports = router
