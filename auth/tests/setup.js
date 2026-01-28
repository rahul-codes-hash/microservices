process.env.JWT_SECRET = 'testsecret'; 

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      expire: jest.fn(),
      incr: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
      connect: jest.fn(),
    })),
  };
});// Add this at the very top of tests/setup.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '6.0.7', // stable MongoDB binary for macOS
      skipMD5: true,
    },
  });

  const uri = mongoServer.getUri();
  await mongoose.connect(uri); // no options needed in Mongoose 7+
});

afterEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});