const {uploadImage} = require('../services/imagekit.service.js');
const Product = require('../models/product.model.js');

async function createProduct(req, res) {
    try {
        const { title, description, priceAmount, priceCurrency = 'INR' } = req.body;

        if(!title || !priceAmount) {
            return res.status(400).json({ message: 'Title and Price Amount are required' });
        }

        const seller = req.user.id; // Assuming user ID is stored in req.user by auth middleware

        const prices = { amount: Number(priceAmount), currency: priceCurrency };

        // const images = [] // Multer stores uploaded files in req.files

        // const files = await Promise.all(
        //     (req.files || []).map(file => uploadImage({buffer : file.buffer, filename : file.originalname}))
        // );

        const images = await Promise.all(
      (req.files || []).map(file =>
        uploadImage(file.buffer, file.originalname)
      )
    );


        // Here you would typically save the product to the database
        // For demonstration, we'll just return the product data

        const product = await Product.create({
            title,
            description,
            prices,
            seller,
            images
        });

        res.status(201).json({
            message: 'Product created successfully',
            product
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProducts(req , res){

    const { q, minPrice, maxPrice , page = 1 , limit = 10} = req.query ;
}

module.exports = {
    createProduct
};
