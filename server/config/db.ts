import mongoose from 'mongoose';

export const connectDB = async (retryCount = 0): Promise<void> => {
  let uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb+srv://heamanthprabhu59_db_user:Heamanth007@cluster0.txhuc3s.mongodb.net/dheeksha_trade?retryWrites=true&w=majority&appName=Cluster0';

  // Strip accidental angle brackets from Atlas connection strings if present
  if (uri.includes('<') && uri.includes('>')) {
    uri = uri.replace(/<([^>]+)>/g, '$1');
  }

  // If URI has no DB specified (ends with .mongodb.net/ or .mongodb.net/?), default to test
  if (uri.includes('.mongodb.net/?')) {
    uri = uri.replace('.mongodb.net/?', '.mongodb.net/test?');
  } else if (uri.endsWith('.mongodb.net') || uri.endsWith('.mongodb.net/')) {
    uri = uri.replace(/\.mongodb\.net\/?$/, '.mongodb.net/test');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`=============================================`);
    console.log(`[Database] MongoDB Atlas Connected Successfully!`);
    console.log(`[Database Host] ${conn.connection.host}`);
    console.log(`[Database Name] ${conn.connection.name}`);
    console.log(`=============================================`);
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB Atlas (Attempt ${retryCount + 1}):`, error);
    if (retryCount < 5) {
      console.log(`[Database] Retrying connection in 3 seconds...`);
      setTimeout(() => connectDB(retryCount + 1), 3000);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected. Attempting reconnection...');
});

mongoose.connection.on('error', (err: any) => {
  console.error('[Database Error] MongoDB connection error:', err);
});

