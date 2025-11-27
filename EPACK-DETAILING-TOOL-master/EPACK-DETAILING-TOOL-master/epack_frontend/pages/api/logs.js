import { request } from 'http';
import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    
    try {
      const client = await clientPromise;
      const db = client.db('epack_test');  // Specify your database name
      const collection = db.collection('logs');  // Choose your collection

      const log = req.body;  // Your log data from the request
      const result = await collection.insertOne(log);

      res.status(200).json({ success: true, result });
    } catch (e) {
      res.status(500).json({ error: 'Failed to log data' });
    }
  } else {
    res.status(405).json({ error: 'Only POST requests allowed' });
  }
}