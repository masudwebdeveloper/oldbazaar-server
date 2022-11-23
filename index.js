const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
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
        // get all products
        app.get('/products', async (req, res) => {
            const query = {};
            const products = await secondHandProductsCollections.find(query).toArray();
            res.send(products)
        })
        // get only categories
        app.get('/categories', async(req, res)=>{
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
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