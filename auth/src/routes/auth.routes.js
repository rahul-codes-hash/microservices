const express = require('express');
const validators = require('../middlewares/validator.middleware.js');
const authController = require('../controllers/auth.controller.js')
const authMiddleware = require('../middlewares/auth.middleware.js');

const router = express.Router();

router.post('/register', validators.registerUserValidations, authController.registerUser);
router.post('/login', validators.loginUserValidations, authController.loginUser);
router.post('/me' , authMiddleware.authMiddleware , authController.getCurrentUser);
router.post('/logout' , authController.logoutUser);

router.get('/users/me/addresses', authMiddleware.authMiddleware, authController.getUserAddresses);
router.post('/users/me/addresses', authMiddleware.authMiddleware, validators.addUserAddressValidations, authController.addUserAddress);
// router.put('/users/me/addresses/:addressId', authMiddleware.authMiddleware, validators.addressValidations, authController.updateUserAddress);
router.delete('/users/me/addresses/:addressId', authMiddleware.authMiddleware, authController.deleteUserAddress);

module.exports = router;