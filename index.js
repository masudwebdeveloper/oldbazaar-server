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

//collect from mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jfl1bty.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const secondHandProductsCollections = client.db('OldBazaar').collection('Products');
        const categoriesCollections = client.db('OldBazaar').collection('categories');
        const usersCollections = client.db('OldBazaar').collection('users');
        // get all products
        app.get('/products', async (req, res) => {
            const query = {};
            const products = await secondHandProductsCollections.find(query).toArray();
            res.send(products)
        })

        //for show product details
        app.get('/products/:id', async(req,res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const product = await secondHandProductsCollections.findOne(filter);
            res.send(product);
        })
        // get only categories
        app.get('/categories', async(req, res)=>{
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        })

        //get sepecific category product show
        app.get('/categories/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const category = await categoriesCollections.findOne(filter);
            const query = {category: category.category};
            const result = await secondHandProductsCollections.find(query).toArray();
            res.send(result);
        })

        //save users
        app.post('/users', async(req, res)=>{
            const query = req.body;
            const user = await usersCollections.insertOne(query);
            res.send(user);
        })

        //get all users this api
        app.get('/users', async(req, res)=>{
            const query = {};
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        })

        //delete users only permision is admin
        app.delete('/users/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const user = await usersCollections.deleteOne(filter);
            res.send(user);
        })

        // give super power for special person so be care full
        app.put('/users/admin/:id', async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updateDoc = {
                $set : {
                    role: 'admin'
                }
            }
            const userUpdate = await usersCollections.updateOne(filter, updateDoc, options);
            res.send(userUpdate);
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