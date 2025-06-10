
const dotenv = require ('dotenv')
const mongoose = require ('mongoose')
dotenv.config();
const url = process.env.MONGO;
const connectDB = async () => {
    try {
        await mongoose.connect(url, {          
        });
        console.log('Database is connected');
    } catch (err) {
        console.error('Error connecting to the database:', err);
        process.exit(1);
    }
  };
mongoose.connection.on("disconnected",()=>{
  console.log("Database disconnected");
})
mongoose.connection.on("connected",()=>{
  console.log("Database connected");
})

module.exports = connectDB;


