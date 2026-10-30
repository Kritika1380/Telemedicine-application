const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nabha-connect';

if (!MONGODB_URI) {
  throw new Error('Please provide the MONGODB_URI environment variable');
}

// Use a global variable to cache the connection across lambda invocations
let cached = global.__mongoose;

if (!cached) {
  cached = { conn: null, promise: null };
  global.__mongoose = cached;
}

async function connect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // useUnifiedTopology and useNewUrlParser are defaults in modern mongoose
    }).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connect();
