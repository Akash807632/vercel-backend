const express = require ('express')
const dotenv = require ('dotenv')
const mongoose = require ('mongoose')
const Portfolio = require('./routes/Porfolio')
const Auth = require('./routes/auth')
const app = express();
app.use(express.json())

const connectDB = require('./db');
require('dotenv').config();
const port  = 3000;
const cors = require("cors");



app.use(cors());
app.use(
  cors({
    origin: "http://localhost:8080", 
    methods: "GET,POST,PUT,DELETE",
    credentials: true, // Allow cookies if needed
  })
);


app.use('/api/auth',Auth)
app.use('/Portfolio',Portfolio)
app.use((err,req,res,next)=>{
  const errStatus = err.status || 500
  const errMessage = err.message || "something wnt wrong!"
  res.status(errStatus).json({
    success:false,
    status:errStatus,
    message:errMessage,
    stack: err.stack,
  })
})


app.listen(port, () => {
    connectDB();
  console.log(`Example app listening on port ${port}`)
})