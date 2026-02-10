const { body, validationResult } = require('express-validator')

const respondwithValidationErrors = (req , res , next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }
    next()
}

const registerUserValidations = [
    body('username')
    .isString()
    .isLength({length: 3})
    .withMessage('Username must be 3 charaters long')
    ,
    body('email')
    .isEmail()
    .withMessage('Invalid email address')
    ,
    body('password')
    .isLength({length: 6})
    .withMessage('Password must be 6 characters long')
    ,
    body('fullName.firstName')
    .isString()
    .withMessage('First name must be a string')
    .notEmpty()
    .withMessage('First name is required')
    ,
    body('fullName.lastName')
    .isString()
    .withMessage('Last name must be a string')
    .notEmpty()
    .withMessage('Last name is required')
    ,
    body('role')
    .optional()
    .isIn(['user' , 'seller'])
    .withMessage('Role must be either user or seller')
    ,
    respondwithValidationErrors
]

const loginUserValidations = [
    body('email')
    .isEmail()
    .withMessage('Invalid email address')
    ,
    body('username')
    .optional()
    .isString()
    .withMessage('Username must be a string')
    ,
    body('password')
    .isLength({length: 6})
    .withMessage('Password must be 6 characters long')
    ,
    (req , res , next) => {
        if(!req.body.email && !req.body.username){
            return res.status(400).json({ errors : [{ message: 'Either email or username is required' }]})
        }
  
    respondwithValidationErrors(req , res , next)
    }
]

const addUserAddressValidations = [
    body('street')
    .isString()
    .withMessage('Street must be a string')
    .notEmpty()
    .withMessage('Street is required')
    ,
    body('city')
    .isString()
    .withMessage('City must be a string')
    .notEmpty()     
    .withMessage('City is required')
    ,
    body('state')
    .isString()
    .withMessage('State must be a string')
    .notEmpty()
    .withMessage('State is required')
    ,
    body('pincode')
    .isString()
    .withMessage('Pincode must be a string')
    .notEmpty()
    .withMessage('Pincode is required')
    ,
    body('country')
    .isString()
    .withMessage('Country must be a string')
    .notEmpty()
    .withMessage('Country is required')
    ,
    body('phone')
    .optional()
    .isString()
    .withMessage('Phone must be a string')
    .bail()
    .matches(/^\d{10}$/)
    .withMessage('Phone must be a valid 10-digit number')
    ,
    body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value')
    ,
    respondwithValidationErrors
]

module.exports = {
    registerUserValidations ,
    loginUserValidations ,
    addUserAddressValidations
}