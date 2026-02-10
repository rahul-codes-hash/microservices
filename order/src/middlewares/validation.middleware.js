const { body , validationResult } = require('express-validator');


const respondwithValidationErrors = (req , res , next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array() })
    }
    next()
}


const createOrderValidation = [
    body('shippinAddress.street')
    .isString()
    .withMessage('Street must be a string')
    .notEmpty()
    .withMessage('Street is required')
    ,
    body('shippinAddress.city')
    .isString()
    .withMessage('City must be a string')
    .notEmpty()     
    .withMessage('City is required')
    ,
    body('shippinAddress.state')
    .isString()
    .withMessage('State must be a string')
    .notEmpty()
    .withMessage('State is required')
    ,
    body('shippinAddress.pincode')
    .isString()
    .withMessage('Pincode must be a string')
    .notEmpty()
    .withMessage('Pincode is required')
    ,
    body('shippinAddress.country')
    .isString()
    .withMessage('Country must be a string')
    .notEmpty()
    .withMessage('Country is required')
    ,
    respondwithValidationErrors
]

const updateAddressValidation = [
    body('shippingAddress.street')
    .isString()
    .withMessage('Street must be a string')
    .notEmpty()
    .withMessage('Street cannot be empty')
    ,
    body('shippingAddress.city')
    .isString()
    .withMessage('City must be a string')
    .notEmpty()
    .withMessage('City cannot be empty')
    ,
    body('shippingAddress.state')
    .isString()
    .withMessage('State must be a string')
    .notEmpty()
    .withMessage('State cannot be empty')
    ,
    body('shippingAddress.pincode')
    .isString()
    .withMessage('Pincode must be a string')
    .notEmpty()
    .withMessage('Pincode cannot be empty')
    .bail()
    .matches(/^\d{4,}$/)
    .withMessage('Pincode must be a valid format')
    ,
    body('shippingAddress.country')
    .isString()
    .withMessage('Country must be a string')
    .notEmpty()
    .withMessage('Country cannot be empty')
    ,
    respondwithValidationErrors
]

module.exports = {

    createOrderValidation ,
    updateAddressValidation

}