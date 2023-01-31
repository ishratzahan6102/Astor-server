const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
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


app.get('/', (req, res) => {
    res.send("astor  is running")
})

app.listen(port, () => {
    console.log(`Server running at port ${port}`)
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.feigjta.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    console.log("token inside verified jwt", req.headers.authorization)
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
    try {

        const allPhones = client.db("resell-shop").collection("allPhones");
        const allData = client.db("resell-shop").collection("allData");
        const bookingsCollection = client.db("resell-shop").collection('bookings');
        const usersCollection = client.db("resell-shop").collection('users');
        const itemsCollection = client.db("resell-shop").collection('items');
        const wishList = client.db("resell-shop").collection('wishList');



        const verifyAdmin = async (req, res, next) => {
            // console.log("inside verify admin",req.decoded.email )
            const decodedEmail = req.decoded.email
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query)


            if (user?.role !== "admin") {
                return res.status(403).send({ message: "forbidden Access" })
            }

            next()
        }

        app.get('/allPhones', async (req, res) => {
            const query = {}
            const result = await allPhones.find(query).toArray()
            res.send(result)
        })

        app.get('/category/:brand', async (req, res) => {
            const brand = req.params.brand;
            const query = { brand: brand };
            const result = await allData.find(query).toArray()
            res.send(result);
        });

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });

        app.delete('/bookings/:id', async (req, res) => {
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
        // post users

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '6h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        // admin check kori
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' });
        })
        //  buyer check kori
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.account === 'buyer' });
        })
        // seller check kori
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.account === 'seller' });
        })

        app.get('/users/buyer', async (req, res) => {
            const query = {
                account: "buyer"
            };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.get('/users/seller', async (req, res) => {
            const query = {
                account: "seller"
            };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.delete('/users/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('users/admin/:id', verifyAdmin, verifyJWT, async (req, res) => {
            const id = req.params.id
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: { role: 'admin' }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
        })

        app.put('/users/seller/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verify: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.put('/users/buyer/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verify: 'verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // add product
        app.get('/addItems', verifyJWT, async (req, res) => {
            const query = {};
            const result = await itemsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/addItems', verifyJWT, async (req, res) => {
            const item = req.body;
            const result = await itemsCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/addItems/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await itemsCollection.deleteOne(filter);
            res.send(result);
        })
        app.put('/addItems/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: 'advertised'
                }
            }
            const result = await itemsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });
        app.get('/advertised', async (req, res) => {
            const query = {
                advertise: 'advertised'
            };
            const result = await itemsCollection.find(query).toArray();
            res.send(result);
        })
        // add to wishlist
        // app.get('/wishlist', async (req, res) => {
        //     const email = req.query.email;
        //     const query = {
        //         email: email
        //     };
        //     const bookings = await wishList.find(query).toArray();
        //     res.send(bookings);
        //     console.log(bookings)

        // })

        app.get('/wishList' , async(req, res) => {
            const email = req.query.email;
            const query = { email : email};
            const result = await wishList.find(query).toArray();
            res.send(result);
        })

        // app.post('/wishList', async (req, res) => {
        //     const wishlist = req.body;

        //     const query = {
        //         itemName: wishlist.itemName,
        //         email: wishlist.email,
        //     }
        //     const alreadyBooked = await wishList.find(query).toArray();
        //     if (alreadyBooked.length) {
        //         const message = `You already have wishlisted ${wishlist.itemName}`
        //         return res.send({ acknowledged: false, message })
        //     }
        //     const result = await wishList.insertOne(wishlist);
        //     res.send(result);
        //     console.log(result)
        // });

        app.post('/wishList' , async(req, res) => {
            const wishlist = req.body ;
            const query = {
                itemName: wishlist.itemName,
                email: wishlist.email
            }
            const alreadyOrdered = await wishList.find(query).toArray();
            if(alreadyOrdered.length) {
                const message = `You have already added ${wishlist.itemName} to your wish list!` ;
                return res.send({acknowledged: false, message})
            }
            const result = await wishList.insertOne(wishlist);
            res.send(result);
        })


        // app.delete('/wishList/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const filter = { _id: ObjectId(id) };
        //     const result = await wishList.deleteOne(filter);
        //     res.send(result);
        // })

        app.delete('/wishList/:id' , async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await wishList.deleteOne(filter);
            res.send(result);
        })
    }

    finally {

    }
}
run().catch(console.log)