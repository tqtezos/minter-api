import IpfsHttpClient from 'ipfs-http-client';
import url from 'url';
import { Readable } from 'stream';
import { IpfsClient, IpfsClientUploadResult } from '.';

export interface SandboxConfig {
  apiBaseUri?: string;
  gatewayUri?: string;
}

export class SandboxIpfsClient implements IpfsClient {

  private config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
    if (this.config.apiBaseUri === undefined) {
      this.config.apiBaseUri = "http://ipfs:5001";
    }
    if (this.config.gatewayUri === undefined) {
      this.config.gatewayUri = "http://127.0.0.1:8080";
    }
  }

  public async uploadFile(data: Readable): Promise<IpfsClientUploadResult> {
    if (this.config.gatewayUri === undefined) {
      throw new TypeError("Expected gatewayUri to be defined by now");
    }

    const ipfsClient = IpfsHttpClient(this.config.apiBaseUri);
    const ipfsFile = await ipfsClient.add(data);
    const cid = ipfsFile.cid.toString();

    return {
      cid: cid,
      size: ipfsFile.size,
      url: url.resolve(this.config.gatewayUri, `/ipfs/${cid}`)
    };
  }

  public async uploadJSON(data: any): Promise<IpfsClientUploadResult> {
    return this.uploadFile(Readable.from(JSON.stringify(data)));
  }

}
