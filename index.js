const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

const app = express();

//middle ware
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorization access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorization access' });
        }
        req.decoded = decoded;
        next();
    })
}

//collect from mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jfl1bty.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const secondHandProductsCollections = client.db('OldBazaar').collection('Products');
        const categoriesCollections = client.db('OldBazaar').collection('categories');
        const usersCollections = client.db('OldBazaar').collection('users');
        const wishlistsCollections = client.db('OldBazaar').collection('wishlists');
        const reportsCollections = client.db('OldBazaar').collection('reports');
        const bookingsCollections = client.db('OldBazaar').collection('bookings');
        const advertiseCollections = client.db('OldBazaar').collection('advertise');
        // verify admin
        //for secrect use jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email };
            const getUser = await usersCollections.findOne(query);
            if (getUser) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' });
        })

        //for client site make hooks this api users role
        app.get('/user/role/:email', async(req, res)=>{
            const email = req.params.email;
            const query = {email: email};
            const getUser = await usersCollections.findOne(query);
            res.send(getUser);
        })


        // get all products
        app.get('/products', async (req, res) => {
            const size = parseInt(req.query.size);
            const page = parseInt(req.query.page);
            const query = {};
            const products = await secondHandProductsCollections.find(query).skip(page * size).limit(size).toArray();
            const count = await secondHandProductsCollections.estimatedDocumentCount();
            res.send({count,products})
        })

        //add to product only permision is admin
        app.post('/products', verifyJWT, async (req, res) => {
            const productInfo = req.body;
            const addProduct = await secondHandProductsCollections.insertOne(productInfo);
            res.send(addProduct);
        })
        //for show product details
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const product = await secondHandProductsCollections.findOne(filter);
            res.send(product);
        })

        //seller get show my product
        app.get('/myproducts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await secondHandProductsCollections.find(query).toArray();
            res.send(result);
        })

        // myproducts deleted api for verified seller
        app.delete('/myproducts/:id',verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const deleteProduct = await secondHandProductsCollections.deleteOne(query);
            res.send(deleteProduct);
        })
        // reported product delete apu only permision is admin for secondhandproductcollections
        app.delete('/reportproduct/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const deleteProduct = await secondHandProductsCollections.deleteOne(query);
            res.send(deleteProduct);
        })
        // reported product delete apu only permision is admin for reports collection
        app.delete('/reportproductdelete/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const deleteProduct = await reportsCollections.deleteOne(query);
            res.send(deleteProduct);
        })

        //delete from advertise collection 
        app.delete('/advertise/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {productId: id};
            const deleteProduct = await advertiseCollections.deleteOne(filter);
            res.send(deleteProduct);
        })
        // get only categories
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        })

        //get sepecific category product show
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const category = await categoriesCollections.findOne(filter);
            const query = { category: category.category };
            const result = await secondHandProductsCollections.find(query).toArray();
            res.send(result);
        })

        //save users
        app.post('/users', async (req, res) => {
            const query = req.body;
            const user = await usersCollections.insertOne(query);
            res.send(user);
        })

        //get all users this api
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        })

        //delete users only permision is admin
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const user = await usersCollections.deleteOne(filter);
            res.send(user);
        })

        // give super power for special person so be care full
        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const userUpdate = await usersCollections.updateOne(filter, updateDoc, options);
            res.send(userUpdate);
        })

        //wishlist products add
        app.post('/wishlist', async (req, res) => {
            const wishlist = req.body;
            const query = {
                email: wishlist.email,
                productId: wishlist.productId
            }

            const alreadyWishlist = await wishlistsCollections.find(query).toArray();
            if (alreadyWishlist.length) {
                const message = `Already wishlist This product ${wishlist.title}`;
                return res.send({ acknowledged: false, message })
            }

            const wishlistProduct = await wishlistsCollections.insertOne(wishlist);
            res.send(wishlistProduct)


        })

        //get wishlist products for email
        app.get('/wishlist', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const wishlistProducts = await wishlistsCollections.find(query).toArray();
            res.send(wishlistProducts);
        })

        //reported products added api
        app.post('/report', async (req, res) => {
            const reportProduct = req.body;
            const query = {
                email: reportProduct.email,
                productId: reportProduct.productId
            }

            const alreadyReported = await reportsCollections.find(query).toArray();
            if (alreadyReported.length) {
                const message = `Already Reported This product ${reportProduct.title}`;
                return res.send({ acknowledged: false, message })
            }

            const reportedProduct = await reportsCollections.insertOne(reportProduct);
           
            res.send(reportedProduct)


        })

        //get all repoeted products
        app.get('/report', async (req, res) => {
            const query = {};
            const reportstProducts = await reportsCollections.find(query).toArray();
            res.send(reportstProducts);
        })

        //for booking specific product api
        app.post('/bookings', async (req, res) => {
            const productData = req.body;
            const query = {
                email: productData.email,
                productName: productData.productName
            }
            const option = {upsert: true};
            const filter = {productId: productData.productId};
            const updateDoc = {
                $set : {
                    status: "booked"
                }
            }
            const alreadyBooked = await bookingsCollections.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have been booked ${productData.productName}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsCollections.insertOne(productData);
            const update = await advertiseCollections.updateOne(filter, updateDoc, option);
            res.send(result);
        })

        // get booking only jwt veryfied person 
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const getBookedProducts = await bookingsCollections.find(query).toArray();
            res.send(getBookedProducts)

        });

        app.get('/bookings/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await bookingsCollections.findOne(query);
            res.send(result);
        })

        //add to advertise ment
        app.post('/advertise', async(req, res)=>{
            const productData = req.body;
            const query = {
                productId: productData.productId,
            }
            const filter = {_id: ObjectId(productData.productId)};
            const options = {upsert: true};
            const updateDoc = {
                $set:{
                    isAdvertise: true
                }
            }
            const alreadyAdvertise = await advertiseCollections.find(query).toArray();
            if(alreadyAdvertise.length){
                const message = 'This product already advertise is running';
                return res.send({acknowledged: false, message})
            }
            const addProduct = await advertiseCollections.insertOne(productData);
            const advertiseProduct = await secondHandProductsCollections.updateOne(filter, updateDoc, options);
            res.send(addProduct);
        })

        //get and show ui advertise api
        app.get('/advertise', async(req,res)=>{
            const query = {};
            const advertiseProducts = await advertiseCollections.find(query).limit(4).toArray();
            res.send(advertiseProducts);

        })
    }
    finally {

    }
}
run().catch(console.dir)


app.get('/', async (req, res) => {
    res.send("old bazaar server is running");
})
app.listen(port, () => {
    console.log(`old bazaar server running on ${port}`);
})