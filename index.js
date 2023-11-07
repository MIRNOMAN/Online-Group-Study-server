const express = require('express');
const cors = require('cors');
const app = express();
const  jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.lyzjy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) =>{  
    const token = req?.cookies?.token;
    // console.log('Verifying token', token);
    if(!token){
      return res.status(401).send({message: 'unauthorized access'});
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) =>{
        if(err){
            return res.status(401).send({message: 'unauthorized access'});
        }
        req.user = decoded;
        next();
    })
    
}
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const assignmentCollection = client.db('assignmentDB').collection('allAssignments');
        const takeAssignmentCollection = client.db('assignmentDB').collection('takeAllAssignments');
       

       app.post('/jwt', async(req, res) =>{
        const user = req.body;
        console.log('user for token', user);
        const token = jwt.sign(user,process.env.ACCESS_TOKEN, {expiresIn: '1h'})
        res
        .cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        })
        .send({success: true});
       })

       app.post('/logout', async(req, res) => {
        const user = req.body;
        console.log('logout user', user);
        res.clearCookie('token', {maxAge: 0}).send({success: true});
       })


        app.get('/assignments', async(req, res) =>{

           let queryObj = {};
           const level = req.query.level;

        //   pagenation

          const page = Number(req.query.page);
          const limit = Number(req.query.limit);

          const skip = (page - 1) * limit;

           if(level){
            queryObj.level = level
           }


            const result = await assignmentCollection.find(queryObj).skip(skip).limit(limit).toArray();

            const total = await assignmentCollection.countDocuments()
            res.send({
                total,
                result
            });
        })


        app.post('/assignments', async (req, res) => {
            const newdata = req.body;
            const result = await assignmentCollection.insertOne(newdata);
            res.send(result);
        })
        
        app.delete('/assignments/:id', async (req, res) => {
          const id = req.params.id;
          const query = {_id: new ObjectId(id)};
          const userEmail = req.query?.userEmail 
         const productEmail = req.query?.productEmail 
         if(userEmail == productEmail) {
          const result = await assignmentCollection.deleteOne(query);
          res.send(result);
         }else{
          res.send('product and email not match')
         }
         
        })
       
        // assignment details
        
        app.get('/details/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await assignmentCollection.findOne(query);
            res.send(result);
            console.log(verifyToken);
          })
      



        // update assignment

        app.get('/updates/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await assignmentCollection.findOne(query)
            res.send(result)
          })
      
      
      
          app.put('/updates/:id', async (req, res) =>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)}
            const options = {upsert: true}
            const updateAsgmt = req.body;
            const update = {
              $set :{
               
                title: updateAsgmt.title,
                level: updateAsgmt.level,
                marks: updateAsgmt.marks,
                date: updateAsgmt.date,
                description: updateAsgmt.description,
                photo: updateAsgmt.photo
              
                
              }
            }
            const result = await assignmentCollection.updateOne(filter, update, options)
            res.send(result)
          })


        //   submitted assignment collection

        app.get('/submittedAssignment', async ( req, res ) => {
          console.log('token owner', req.user)
           const query = {status : 'pending'};
            const result = await takeAssignmentCollection.find(query).toArray();
            res.send(result);
          })

          app.get('/mySubmittedAssignment', async ( req, res ) => {
            console.log('token owner', req.user)
             const query = {status : 'complete'};
              const result = await takeAssignmentCollection.find(query).toArray();
              res.send(result);
            })
      
          app.post('/submittedAssignment', async ( req, res ) => {
            const product = req.body;
            const result = await takeAssignmentCollection.insertOne(product)
            res.send(result);
          })

           // status update
          app.patch('/submittedAssignment', async (req, res) => {
            const user = req.body;
            const filter = {email : user.email};
            const updateDoc = {
              $set:{
                status : user.status,
                giveMark: user.giveMark,
                feedback: user.feedback
              }
            }
            const result = await takeAssignmentCollection.updateOne(filter,updateDoc);
            res.send(result);
          })

          // assignment marks

          app.get('/submittedAssignment/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await takeAssignmentCollection.findOne(query)
            res.send(result)
            console.log(result)
          })
      
      
      
         

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Online Group study');
})

app.listen(port, () => {
    console.log(`Online group study listening on port ${port}`)
})