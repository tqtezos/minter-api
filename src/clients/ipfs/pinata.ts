import axios from 'axios';
import url from 'url';
import { Readable } from 'stream';
import pinataSDK from '@pinata/sdk';
import { IpfsClient, IpfsClientUploadResult } from '.';

export interface PinataConfig {
  apiKey: string;
  apiSecret: string;
  gatewayUri?: string;
}

export class PinataIpfsClient implements IpfsClient {

  private config: PinataConfig;

  constructor(config: PinataConfig) {
    this.config = config;
    if (this.config.gatewayUri === undefined) {
      this.config.gatewayUri = "https://gateway.pinata.cloud";
    }
  }

  public async uploadFile(data: Readable): Promise<IpfsClientUploadResult> {
    const pinata = pinataSDK(this.config.apiKey, this.config.apiSecret);
    const pinataRes = await pinata.pinFileToIPFS(data);
    return this.formatResult(pinataRes);
  }

  public async uploadJSON(data: any): Promise<IpfsClientUploadResult> {
    const pinata = pinataSDK(this.config.apiKey, this.config.apiSecret);
    const pinataRes = await pinata.pinJSONToIPFS(data);
    return this.formatResult(pinataRes);
  }

  private formatResult(pinataData: any): IpfsClientUploadResult {
    if (this.config.gatewayUri === undefined) {
      throw new TypeError("Expected gatewayUri to be defined by now");
    }

    return {
      cid: pinataData.IpfsHash,
      size: pinataData.PinSize,
      url: url.resolve(this.config.gatewayUri, `/ipfs/${pinataData.IpfsHash}`)
    };
  }

}
