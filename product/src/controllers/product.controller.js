const {uploadImage} = require('../services/imagekit.service.js');
const productModel = require('../models/product.model.js');

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

    const { q, minPrice, maxPrice , skip = 0 , limit = 20 } = req.query ;

    const filter = {}

    if(q){
        filter.$text = { $search : q }
    }

   

        if(minPrice){
            filter['price.amount'] = {...filter['price.amount'] , $gte : Number(minPrice)}
        }

        if(maxPrice){
            filter['price.amount'] = {...filter['price.amount'] , $lte : Number(maxPrice)}
        }

    try {
        const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20))

        res.status(200).json({ data: products })
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProductbyId(req , res){
    const { id } = req.params ;

    try {
        const product = await productModel.findById(id) ;

        if(!product){
            return res.status(404).json({ message: 'Product not found' })
        }

        res.status(200).json({ product : product })
    } catch (error) {
        console.error('Error fetching product by ID:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function updateProduct(req, res) {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await productModel.findOne({ 
        _id: id ,
     });

    if(!product){
        return res.status(404).json({ message: 'Product not found or you are not authorized to update this product' });
    }

    if(product.seller.toString() !== req.user.id){
        return res.status(403).json({ message: 'You are not authorized to update this product' });
    }

    const allowedUpdates = ['title', 'description', 'price'];
    for(const key of Object.keys(req.body)){
        if(allowedUpdates.includes(key)){
            if(key === 'price' && typeof req.body[key] === 'object'){
                if(req.body.price.amount !== undefined){
                    product.price.amount = Number(req.body.price.amount) ;
                }
                if(req.body.price.currency !== undefined){
                    product.price.currency = req.body.price.currency ;
                }
            } else {
                product[key] = req.body[key] ;
            }
        }
    }

    try {
        const updatedProduct = await product.save();
        res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteProduct(req, res) {
    const { id } = req.params;
    
    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({ message: 'Invalid product ID' });
    }

    const product = await productModel.findOne(
        { _id: id }
    );

    if(!product){
        return res.status(404).json({ message: 'Product not found' });
    }

    if(product.seller.toString() !== req.user.id){
        return res.status(403).json({ message: 'You are not authorized to delete this product' });
    }

    try {
        await productModel.findOneAndDelete({ _id: id });
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProductsBySeller(req, res) {
    const seller = req.user.id;

    const { skip = 0, limit = 20 } = req.query;
    
    try {
        const products = await productModel.find({ seller: seller.id })
            .skip(skip)
            .limit(Math.min(limit, 20));

        return res.status(200).json({ data: products });

    } catch (error) {
        console.error('Error fetching products by seller:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    createProduct ,
    getProducts ,
    getProductbyId ,
    updateProduct ,
    deleteProduct ,
    getProductsBySeller
};
