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

// =============================================================================
// Constants
// =============================================================================
export const privateKeyPath = "./keys/privateKey.txt";
export const EXISTING_DNS_LOCATION = {
  DNSTXT: "wet-red-chicken.sandbox.openattestation.com",
  DNSDID: "catholic-beige-possum.sandbox.openattestation.com",
};
export const EXISTING_DOCUMENT_STORE = {
  DNSTXT: "0x8c9460deDCBe881ddaE1681c3aa48d6eEC723160",
  DNSDID: "0x259D6bb42F1070d8EE5778F1B88eB5D93AB6192f",
};
export const WALLET_ADDRESS = "0xC5f1FFfaAA0984c0dB6a82440b9885204eb3A482";
export const DID = `did:ethr:${WALLET_ADDRESS}`;
export const DID_PUBLIC_KEY = `${DID}#controller`;
