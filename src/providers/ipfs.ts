import fs from 'fs';
import url from 'url';
import sharp from 'sharp';
import {
  IpfsClient,
  IpfsClientUploadResult,
  PinataIpfsClient,
  FleekIpfsClient,
  SandboxIpfsClient,
  PinataConfig,
  FleekConfig,
  SandboxConfig
} from '../clients/ipfs';

export interface IpfsConfig {
  provider: string;
  pinata?: PinataConfig;
  fleek?: FleekConfig;
  sandbox?: SandboxConfig;
  publicGatewayUri?: string;
}

export interface IpfsUploadResult {
  cid: string;
  size: number;
  ipfsUri: string;
  url: string;
  publicGatewayUri: string;
}

export interface IpfsUploadThumbResult {
  cid: string;
  size: number;
  ipfsUri: string;
  url: string;
  publicGatewayUri: string;
  thumbnail: IpfsUploadResult;
}

export class IpfsProvider {

  private config: IpfsConfig;
  private client: IpfsClient;

  constructor(config: IpfsConfig) {
    this.config = config;

    if (
      this.config.provider === "pinata" &&
      this.config.pinata !== undefined &&
      Object.keys(this.config.pinata).length
    ) {
      this.client = new PinataIpfsClient(this.config.pinata);
    } else if (
      this.config.provider === "fleek" &&
      this.config.fleek !== undefined &&
      Object.keys(this.config.fleek).length
    ) {
      this.client = new FleekIpfsClient(this.config.fleek);
    } else {
      this.client = new SandboxIpfsClient(this.config.sandbox || {});
    }

    if (this.config.publicGatewayUri === undefined) {
      if (this.client instanceof SandboxIpfsClient) {
        this.config.publicGatewayUri = "http://127.0.0.1:8080";
      } else {
        this.config.publicGatewayUri = "https://cloudflare-ipfs.com";
      }
    }
  }

  public getClient(): IpfsClient {
    return this.client;
  }

  public async uploadFile(tempFilePath: string): Promise<IpfsUploadResult> {
    const res = await this.client.uploadFile(fs.createReadStream(tempFilePath));
    return this.formatClientResult(res);
  }

  public async uploadImageWithThumbnail(tempFilePath: string): Promise<IpfsUploadThumbResult> {
    const res = await this.uploadFile(tempFilePath);

    const thumbnailPath = `${tempFilePath}-thumbnail`;
    await sharp(tempFilePath).resize(200, 200).toFile(thumbnailPath);

    const thumbRes = await this.uploadFile(thumbnailPath);
    fs.unlink(thumbnailPath, () => null);

    return {
      ...res,
      thumbnail: thumbRes
    };
  }

  public async uploadJSON(data: any): Promise<IpfsUploadResult> {
    const res = await this.client.uploadJSON(data);
    return this.formatClientResult(res);
  }

  private formatClientResult(res: IpfsClientUploadResult): IpfsUploadResult {
    if (this.config.publicGatewayUri === undefined) {
      throw new TypeError("Expected publicGatewayUri to be defined by now");
    }

    return {
      ...res,
      ipfsUri: `ipfs://${res.cid}`,
      publicGatewayUri: url.resolve(this.config.publicGatewayUri, `/ipfs/${res.cid}`)
    };
  }

}
