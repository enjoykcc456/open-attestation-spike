import { CipherGCMTypes, CipherCCMTypes } from "crypto";

// =============================================================================
// Typings
// =============================================================================
export enum PassStatus {
  LIVE = "live",
  DEAD = "dead",
}

export enum Sex {
  MALE = "male",
  FEMALE = "female",
}

export interface PassRecipient {
  name: string;
  profileImage: string;
  fin: string;
  dob: string;
  sex: Sex;
  nationality: string;
}

export interface EncryptionConfig {
  algorithm: CipherCCMTypes | CipherGCMTypes;
  dkLen: number;
  N: number;
  r: number;
  p: number;
}

// =============================================================================
// Constants
// =============================================================================
export const privateKeyPath = "./keys/privateKey.txt";
export const EXISTING_DNS_LOCATION = {
  DNSTXT: "wet-red-chicken.sandbox.openattestation.com",
  DNSDID: "dev.file.gov.sg",
};
export const EXISTING_DOCUMENT_STORE = {
  DNSTXT: "0x8c9460deDCBe881ddaE1681c3aa48d6eEC723160",
  DNSDID: "0x259D6bb42F1070d8EE5778F1B88eB5D93AB6192f",
};
export const WALLET_ADDRESS = "0xC5f1FFfaAA0984c0dB6a82440b9885204eb3A482";
export const DID = `did:ethr:${WALLET_ADDRESS}`;
export const DID_PUBLIC_KEY = `${DID}#controller`;

export const VERIFICATION_URL = "https://www.dev.file.gov.sg/verify"; // http://localhost:3000/verify
export const OCSP_VERIFICATION_URL =
  "https://www.dev.file.gov.sg/core/open-attestation/revocation"; // http://localhost:3002/core/open-attestation/revocation
export const PAYLOAD_URL = `https://${process.env.BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/document`; // TODO: Change to filesg static file document bucket
export const RENDERER_URL = "https://renderer.dev.file.gov.sg/"; // http://localhost:3010

export const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: "aes-256-gcm",
  dkLen: 32,
  N: 1024,
  r: 8,
  p: 1,
};
