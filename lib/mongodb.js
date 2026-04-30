import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_CONNECTION_STRING;

if (!uri) {
  throw new Error("MONGODB_CONNECTION_STRING is not defined.");
}

const options = {
  retryWrites: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (global._mongoClientUri && global._mongoClientUri !== uri) {
    if (global._mongoClient) {
      global._mongoClient.close().catch(() => {});
    }
    global._mongoClient = undefined;
    global._mongoClientPromise = undefined;
  }

  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClient = client;
    global._mongoClientPromise = client.connect();
    global._mongoClientUri = uri;
  }

  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
