import { Request, Response } from 'express';
import { IpfsProvider } from './providers/ipfs';
import axios from 'axios';
import { Knex } from 'knex';

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
  db: Knex<any, unknown[]>,
  bigMapId: number,
  offset: number,
  size: number
) {
  console.log(`Offset: ${offset}, Size: ${size}`);
  const keysResp = await axios.get(
    `https://api.better-call.dev/v1/bigmap/edo2net/${bigMapId}/keys?offset=${offset}&size=${size}`
  );
  const data = keysResp.data;
  for (let a of data) {
    await db('bigmap_key').insert({
      bigmap_id: bigMapId,
      key_string: a.data.key_string,
      data: JSON.stringify(a.data),
      count: a.count
    });
  }
}

async function cacheBigMapKeys(db: Knex<any, unknown[]>, bigMapId: number) {
  const bigMapResp = await axios.get(
    `https://api.better-call.dev/v1/bigmap/edo2net/${bigMapId}`
  );
  // *DANGER* - the knex type definitions are not correctly aligned with the
  // true data being passed around in the library. This code is fragile
  // because of this. Proceed with caution :(
  const bigMapKeyCount = ((
    await db('bigmap_key')
      .select('*')
      .where({
        bigmap_id: bigMapId
      })
      .count<Record<string, number>>({ count: '*' })
  )[0] as any).count;

  const numUncachedKeys = bigMapResp.data.total_keys - bigMapKeyCount;
  console.log(`Number uncached keys: ${numUncachedKeys}`);

  if (numUncachedKeys > 0) {
    for (let i = numUncachedKeys; i > 0; i = i - 10) {
      const offset = Math.floor((numUncachedKeys - i) / 10) * 10;
      const rem = i % 10;
      const size = rem === 0 || i > 10 ? 10 : rem;
      await cacheBigMapKeyRange(db, bigMapId, offset, size);
    }
  }
}

export async function handleCachedBigmapQuery(
  db: Knex<any, unknown[]>,
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
  await cacheBigMapKeys(db, bigMapId);
  const bigMapKeys = await db('bigmap_key').select('*').where({
    bigmap_id: bigMapId
  });
  const results = bigMapKeys.map((v: any) => {
    return { data: JSON.parse(v.data), count: v.count };
  });
  return res.status(200).json(Array.from(results.values()));
}
