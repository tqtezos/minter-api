import { Request, Response } from 'express';
import { IpfsProvider } from './providers/ipfs';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

export async function handleIpfsFileUpload(
  ipfsProvider: IpfsProvider,
  req: Request,
  res: Response
) {
  const file = req.files?.file;
  if (!file?.data) {
    return res.status(500).json({
      error: 'No file data found'
    });
  }

  try {
    const content = await ipfsProvider.uploadFile(file.tempFilePath);
    return res.status(200).json(content);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: 'File upload failed' });
  }
}

export async function handleIpfsImageWithThumbnailUpload(
  ipfsProvider: IpfsProvider,
  req: Request,
  res: Response
) {
  const file = req.files?.file;
  if (!file?.data) {
    return res.status(500).json({
      error: 'No file data found'
    });
  }

  try {
    const content = await ipfsProvider.uploadImageWithThumbnail(
      file.tempFilePath
    );
    return res.status(200).json(content);
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: 'File upload failed' });
  }
}

export async function handleIpfsJSONUpload(
  ipfsProvider: IpfsProvider,
  req: Request,
  res: Response
) {
  if (req.body === undefined) {
    return res.status(500).json({
      error: 'Could not retrieve JSON request body'
    });
  }

  try {
    const content = await ipfsProvider.uploadJSON(req.body);
    return res.status(200).json(content);
  } catch (e) {
    return res.status(500).json({
      error: 'JSON upload failed'
    });
  }
}

async function cacheBigMapKeyRange(
  prisma: PrismaClient,
  bigMapId: number,
  offset: number,
  size: number
) {
  console.log(`Offset: ${offset}, Size: ${size}`);
  const keysResp = await axios.get(
    `https://api.better-call.dev/v1/bigmap/edo2net/${bigMapId}/keys?offset=${offset}&size=${size}`
  );
  const data = keysResp.data;
  for (let item of data) {
    try {
      await prisma.bigMapKey.create({
        data: {
          bigMapId,
          keyString: item.data.key_string,
          data: JSON.stringify(item.data),
          count: item.count
        }
      });
    } catch (e) {
      console.log(e);
    }
  }
}

async function cacheBigMapKeys(prisma: PrismaClient, bigMapId: number) {
  const bigMapResp = await axios.get(
    `https://api.better-call.dev/v1/bigmap/edo2net/${bigMapId}`
  );
  const bigMapKeyCount = await prisma.bigMapKey.count({ where: { bigMapId } });
  const numUncachedKeys = bigMapResp.data.total_keys - bigMapKeyCount;

  if (numUncachedKeys > 0) {
    for (let i = numUncachedKeys; i > 0; i = i - 10) {
      const offset = Math.floor((numUncachedKeys - i) / 10) * 10;
      const rem = i % 10;
      const size = rem === 0 || i > 10 ? 10 : rem;
      await cacheBigMapKeyRange(prisma, bigMapId, offset, size);
    }
  }
}

function validateNetwork(network: string) {
  switch (network) {
    case 'mainnet':
    case 'edo2net':
    case 'sandbox':
      return true;
    default:
      return false;
  }
}

export async function handleCachedBigmapQuery(
  prisma: PrismaClient,
  req: Request,
  res: Response
) {
  let bigMapId;
  try {
    bigMapId = parseInt(req.params.id);
  } catch (e) {
    return res.status(500).json({
      error: 'Failed to parse bigmap id'
    });
  }

  const network = req.params.network;
  if (!network || !validateNetwork(network)) {
    return res.status(500).json({
      error: `Network '${network}' is not supported`
    });
  }

  await cacheBigMapKeys(prisma, bigMapId);

  const bigMapKeys = await prisma.bigMapKey.findMany({ where: { bigMapId } });
  const results = bigMapKeys.map(v => ({
    data: JSON.parse(v.data),
    count: v.count
  }));

  return res.status(200).json(results);
}
