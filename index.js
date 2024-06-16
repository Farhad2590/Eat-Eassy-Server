const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const port = process.env.PORT || 8000

// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cd6vky8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    // auth related api


    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })


    const mealsCollection = client.db("eatEassyDb").collection("meals");
    const reviewCollection = client.db("eatEassyDb").collection("reviews");

    app.get('/meals', async (req, res) => {
      const result = await mealsCollection.find().toArray();
      res.send(result);
    })

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    app.post('/reviews', async (req, res) => {
      const newProduct = req.body;
      console.log(newProduct);
      const result = await reviewCollection.insertOne(newProduct)
      res.send(result)
    })


    // Get all jobs data from db for pagination
    app.get('/all-meals', async (req, res) => {
      const size = parseInt(req.query.size)
      const page = parseInt(req.query.page) - 1
      const filter = req.query.filter
      const sort = req.query.sort
      const search = req.query.search
      // console.log(size, page)

      let query = {
        title:{$regex: search, $options: 'i'}
      }
      if (filter) query.category = filter
      let options = {}
      if (sort) options = { sort: { price: sort === 'asc' ? 1 : -1 } }
      const result = await mealsCollection.find(query,options).skip(page * size).limit(size).toArray()

      res.send(result)
    })

    // Get all jobs data count from db
    app.get('/meals-count', async (req, res) => {
      const filter = req.query.filter
      const search = req.query.search
      let query = {
        title:{$regex: search, $options: 'i'}
      }
      if (filter) query.category = filter
      const count = await mealsCollection.countDocuments(query)

      res.send({ count })
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