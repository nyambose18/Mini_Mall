import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './config.js';

mongoose.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.passwordHash;
    return ret;
  },
});

let memoryServer = null;

export async function connectDb() {
  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] connected to ${config.mongoUri}`);
    return;
  }

  await fs.mkdir(config.dataDir, { recursive: true });
  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbPath: config.dataDir,
      storageEngine: 'wiredTiger',
    },
  });
  await mongoose.connect(memoryServer.getUri('mini_mall'));
  console.log(`[db] local MongoDB started; data is stored in ${config.dataDir}`);
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

export function isUsingLocalDb() {
  return Boolean(memoryServer);
}

mongoose.connection.on('error', (error) => {
  console.error('[db] connection error:', error.message);
});