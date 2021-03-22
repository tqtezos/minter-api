import express, { Express } from 'express';
import bodyParser from 'body-parser';
import fileUpload from 'express-fileupload';
import http from 'http';
import fs from 'fs';
import cors from 'cors';
import { getProvider } from './helpers/ipfs';
import {
  handleCachedBigmapQuery,
  handleIpfsFileUpload,
  handleIpfsImageWithThumbnailUpload,
  handleIpfsJSONUpload
} from './handlers';
import { knex } from 'knex';
import { PrismaClient } from '@prisma/client';

if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp');
}

const db = knex({
  client: 'sqlite3',
  connection: { filename: ':memory:' }
});

async function createHttpServer(app: Express) {
  const prisma = new PrismaClient();

  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(
    fileUpload({
      limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
      useTempFiles: true
    })
  );

  app.get('/', (req, res) => {
    return res.status(200).json({ status: 'OK' });
  });

  const ipfsProvider = await getProvider();

  app.post('/ipfs-file-upload', (req, res) => {
    return handleIpfsFileUpload(ipfsProvider, req, res);
  });

  app.post('/ipfs-image-with-thumbnail-upload', (req, res) => {
    return handleIpfsImageWithThumbnailUpload(ipfsProvider, req, res);
  });

  app.post('/ipfs-json-upload', (req, res) => {
    return handleIpfsJSONUpload(ipfsProvider, req, res);
  });

  app.get('/cached-bigmap/:network/:id', (req, res) => {
    return handleCachedBigmapQuery(prisma, req, res);
  });

  const httpServer = http.createServer(app);
  return httpServer;
}

process.on('unhandledRejection', (reason, _promise) => {
  console.log('[Process] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', error => {
  console.log('[Process] Uncaught Exception:', error);
});

async function run() {
  const envPort = process.env.MINTER_API_PORT;
  const port = envPort ? parseInt(envPort) : 3300;
  const app = express();
  const server = await createHttpServer(app);
  server.listen(port, () => {
    console.log(`[Server] 🚀 Server ready on port ${port}`);
  });
}

async function main() {
  try {
    await run();
  } catch (e) {
    console.log('FATAL - an error occurred during startup:');
    console.dir(e);
    process.exit(1);
  }
}

main();
