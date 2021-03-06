import fs from 'fs';
import url from 'url';
import crypto from 'crypto';
import fleekStorage from '@fleekhq/fleek-storage-js';
import { Readable } from 'stream';
import { IpfsClient, IpfsClientUploadResult } from '.';

export interface FleekConfig {
  apiKey: string;
  apiSecret: string;
  keyPrefix?: string;
  bucket?: string;
  gatewayUri?: string;
}

const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

const sha1 = (b: Buffer): string => {
  const hash = crypto.createHash("sha1");
  hash.update(b);
  return hash.digest("hex");
};

export class FleekIpfsClient implements IpfsClient {

  private config: FleekConfig;

  constructor(config: FleekConfig) {
    this.config = config;
    if (this.config.gatewayUri === undefined) {
      this.config.gatewayUri = "https://ipfs.fleek.co";
    }
  }

  public async uploadFile(data: Readable): Promise<IpfsClientUploadResult> {
    if (this.config.gatewayUri === undefined) {
      throw new TypeError("Expected gatewayUri to be defined by now");
    }

    const bufferData = await streamToBuffer(data);

    const payload = {
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
      data: bufferData,
      key: (this.config.keyPrefix || "") + sha1(bufferData),
      bucket: this.config.bucket
    };

    const res = await fleekStorage.upload(payload);

    return {
      cid: res.hash,
      size: bufferData.length,
      url: url.resolve(this.config.gatewayUri, `/ipfs/${res.hash}`)
    };
  }

  public async uploadJSON(data: any): Promise<IpfsClientUploadResult> {
    return this.uploadFile(Readable.from(JSON.stringify(data)));
  }

}
