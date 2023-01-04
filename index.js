const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000
// webtoken 

const jwt = require('jsonwebtoken');
const { query } = require('express');

// .env er jonno config
require('dotenv').config()
const app = express()

// middle ware
app.use(cors())
app.use(express.json())



app.get('/', ( req, res) => {
    res.send("astor  is running")
})

app.listen(port, () => {
    console.log(`Server running at port ${port}`)
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.feigjta.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    console.log("token inside verified jwt" ,req.headers.authorization)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try{
 
        const allPhones = client.db("resell-shop").collection("allPhones");
        const allData = client.db("resell-shop").collection("allData");
        const bookingsCollection = client.db("resell-shop").collection('bookings');
        const usersCollection = client.db("resell-shop").collection('users');
        const itemsCollection = client.db("resell-shop").collection('items');
        const wishList = client.db("resell-shop").collection('wishList');
       

        app.get('/allPhones' , async(req, res) => {
            const query = {}
            const result = await allPhones.find(query).toArray()
            res.send(result)
        })


        app.get('/category/:brand', async (req, res) => {
            const brand = req.params.brand;
            const query = { brand : brand};
            const result = await allData.find(query).toArray()
            res.send(result);
        });


        app.get('/bookings' , async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
            console.log(bookings)
        });


        app.delete('/bookings/:id',  async (req, res) => {
                const id = req.params.id;
                const filter = { _id: ObjectId(id) };
                const result = await bookingsCollection.deleteOne(filter);
                res.send(result);
            })


        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking)
            const query = {
                itemName: booking.itemName,
                email: booking.email,
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have ordered ${booking.itemName}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });

        
        

            
    }

    finally{
    
       

    }
}

run().catch(console.log)