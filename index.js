const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const port = process.env.PORT || 8000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://eateassy-41e3e.web.app'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())



const uri = `mongodb+srv://eatEassy:WW0IRpViQMKcmnQ3@cluster0.cd6vky8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,// set true if anything wrong happend this is for search
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // auth related api


    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })


    const mealsCollection = client.db("eatEassyDb").collection("meals");
    const reviewCollection = client.db("eatEassyDb").collection("reviews");
    const userCollection = client.db("eatEassyDb").collection("users");
    const upcommingCollection = client.db("eatEassyDb").collection("upcomming");
    const requestCollection = client.db("eatEassyDb").collection("meal_request");
    const paymentCollection = client.db("eatEassyDb").collection("payment");

    // Ensuring text index
    await mealsCollection.createIndex({ title: "text", description: "text" });

    // Search functionality
    app.get('/search', async (req, res) => {
      const { query } = req.query;
      try {
        const result = await mealsCollection.find({
          $text: { $search: query }
        }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });
    // payment intent
    app.get('/payments/:email', async (req, res) => {
      const query = { email: req.params.email }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/payments', async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    })


    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      res.send({ paymentResult });
    })

    app.patch('/servedMeal/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'served'
        }
      }
      const result = await requestCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //Meal requests

    app.get('/requested_meals/:email', async (req, res) => {
      const query = { user_email: req.params.email }
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/requested_meals', async (req, res) => {
      const result = await requestCollection.find().toArray();
      res.send(result);
    })

    app.post('/mealRequest', async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);
      const result = await requestCollection.insertOne(newProduct)
      res.send(result)
    })

    app.delete('/requested_meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await requestCollection.deleteOne(query);
      res.send(result);
    })


    //upcomming Meals
    app.post('/upcomming', async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);
      const result = await upcommingCollection.insertOne(newProduct)
      res.send(result)
    })

    app.patch('/upcommingMeals/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const likes = item.likes || 1;

      console.log(item, id);
      const updatedDoc = {
        $set: {
          likes: likes
        }
      }
      console.log(updatedDoc);
      const result = await upcommingCollection.updateOne(query, updatedDoc)
      res.send(result);
    })

    app.get('/upcomming', async (req, res) => {
      const result = await upcommingCollection.find().toArray();
      res.send(result);
    })


    //main Meals
    app.get('/meals', async (req, res) => {
      const result = await mealsCollection.find().toArray();
      res.send(result);
    })
     app.get('/meals/:email', async (req, res) => {
      const query = { email: req.params.email }
      const result = await mealsCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/meals', async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);
      const result = await mealsCollection.insertOne(newProduct)
      res.send(result)
    })

    app.patch('/meals/:title', async (req, res) => {
      const item = req.body;
      const title = req.params.title;
      const filter = { title: title }
      const likes = item.likes || 1;

      // console.log(item,likes);
      const updatedDoc = {
        $set: {
          likes: likes
        }
      }
      console.log(updatedDoc);
      const result = await mealsCollection.updateOne(filter, updatedDoc)
      res.send(result);

    })
    app.patch('/meals/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          title: item.title,
          category: item.category,
          rating: item.rating,
          likes: item.likes,
          ingredients: item.ingredients,
          price: item.price,
          description: item.description,
          image: item.image
        }
      }

      const result = await mealsCollection.updateOne(filter, updatedDoc)
      console.log(result);
      res.send(result);
    })
    // Get all meals data from db for pagination
    app.get('/all-meals', async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      const filter = req.query.filter
      const sort = req.query.sort
      const search = req.query.search
      // console.log(size, page)

      let query = {
        title: { $regex: search, $options: 'i' }
      }
      if (filter) query.category = filter
      let options = {}
      if (sort) options = { sort: { price: sort === 'asc' ? 1 : -1 } }
      const result = await mealsCollection.find(query, options).skip(page * size).limit(size).toArray()

      res.send(result)
    })

    app.delete('/meals/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await mealsCollection.deleteOne(query);
      res.send(result);
    })

    // Get all meals data count from db
    app.get('/meals-count', async (req, res) => {
      const filter = req.query.filter
      const search = req.query.search
      let query = {
        title: { $regex: search, $options: 'i' }
      }
      if (filter) query.category = filter
      const count = await mealsCollection.countDocuments(query)

      res.send({ count })
    })


    //reviews

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    app.delete('/reviews/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    })

    app.post('/reviews', async (req, res) => {
      const newProduct = req.body;
      // console.log(newProduct);
      const result = await reviewCollection.insertOne(newProduct)
      res.send(result)
    })

    app.get('/reviews/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email);
      try {
        const result = await reviewCollection.find({ user_email: email }).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching reviews from the database:', error);
        res.status(500).send('Internal Server Error');
      }
    });

    app.put('/UpDateReviews/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          review: item.review,
          rating: item.rating,
        }
      }

      const result = await mealsCollection.updateOne(filter, updatedDoc)
      console.log(result);
      res.send(result);
    })



    //users

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    // get a user info by email from db
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const result = await userCollection.findOne({ email })
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })




    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Eat Easy Server..')
})

app.listen(port, () => {
  console.log(`Eat Easy is running on port ${port}`)
})