// src/controllers/auth.controller.js
const userModel = require('../models/user.model.js')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const redis = require('../db/redis.js')
const { publishToQueue } = require('../broker/broker.js')

function isStrongPassword(password) {
  // Example rules: min 8 chars, 1 uppercase, 1 lowercase, 1 number
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

async function registerUser(req, res) {
  try {
    const { username, email, password, fullName: { firstName, lastName } , role } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password is too weak' });
    }

    const isUserAlreadyExists = await userModel.findOne({ $or: [{ username }, { email }] });
    if (isUserAlreadyExists) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hash,
      fullName: { firstName, lastName },
      role : role || 'user'
    });

      // publish user created event to rabbitmq queue for other microservices to consume and perform their respective tasks like sending welcome email to the user or creating user profile in the profile microservice etc
      await Promise.all([
        publishToQueue('AUTH_NOTIFICATION.USER_CREATED', { 
          id: user._id, 
          username: user.username,
          email: user.email,
          fullName: user.fullName,
        }),
        publishToQueue('AUTH_SELLER_DASHBOARD.USER_CREATED', user)
      ]);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error('Error in registerUser: ', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function loginUser(req, res) {
  try {
    const { email, username, password } = req.body;

    // Validate input
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (!email && !username) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    // Find user by email or username
    const user = await userModel.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { username }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }

    // Check if user account is active
    if (user.isActive === false) {
      return res.status(401).json({ message: 'User account is inactive' });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set secure httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: 'User login successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    console.error('Error in loginUser: ', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCurrentUser(req, res) {

    return res.status(200).json({ message: 'Current user fetched successfully', user: req.user  });

}

async function logoutUser(req, res) {

    const token = req.cookies.token;

    if(token){

      redis.set(`blacklist_${token}`, true , 'EX', 24 * 60 * 60); 
     }

     res.clearCookie('token' , {
      httpOnly: true,
      secure: true,
     });

     return res.status(200).json({ message: 'User logged out successfully' });

    }

    async function getUserAddresses(req, res) {
      const id = req.user._id;
      const user = await userModel.findById(id).select('addresses');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(200).json({
        message: 'User addresses fetched successfully',
        addresses: user.addresses });
    }

    async function addUserAddress(req, res) {
      const id = req.user.id;
      const {street , city , state , pincode , country , isDefault} = req.body;

     const user = await userModel.findOneAndUpdate(
        { _id: id },
        {
          $push: {
            addresses: {
              street,
              city,
              state,
              pincode,
              country,
              isDefault
            }
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const newAddress = user.addresses[user.addresses.length - 1];

      return res.status(201).json({ message: 'Address added successfully', address: newAddress });
    }

    async function deleteUserAddress(req, res) {
      const id = req.user.id;
      const { addressId } = req.params;

      const isAddressExists = await userModel.findOne(
        { _id: id, 'addresses._id': addressId }
      );

      if (!isAddressExists) {
        return res.status(404).json({ message: 'Address not found' });
      }

      const user = await userModel.findOneAndUpdate(
        { _id: id },
        {
          $pull: {
            addresses: { _id: addressId }
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const addressExists = user.addresses.some(address => address._id.toString() === addressId);
      if (addressExists) {
        return res.status(500).json({ message: 'Failed to delete address' });
      }

      return res.status(200).json({ message: 'Address deleted successfully',
        addresses: user.addresses
       });
    }



module.exports = { registerUser, loginUser , getCurrentUser , logoutUser, getUserAddresses, addUserAddress, deleteUserAddress };
