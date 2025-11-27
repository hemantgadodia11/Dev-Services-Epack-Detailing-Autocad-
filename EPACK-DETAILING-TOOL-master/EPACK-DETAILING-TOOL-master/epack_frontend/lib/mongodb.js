import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://vulture1302:ba6lLAq2rHl58PSG@cluster0.lcz7v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0&ssl=true";  // Add your MongoDB connection string to .env.local
let client;
let clientPromise;




  // In development mode, use a global variable to preserve connection across module reloads

    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  clientPromise = global._mongoClientPromise;


export default clientPromise;
