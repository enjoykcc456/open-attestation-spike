import { promises as fs } from "fs";
import { Wallet, providers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

import { EXISTING_DOCUMENT_STORE, privateKeyPath } from "./common/typing";
import { testDnsTxt } from "./src/dns-txt";
import { UpgradableDocumentStore } from "@govtechsg/document-store/src/contracts/UpgradableDocumentStore";
import { connect } from "@govtechsg/document-store";
import { decryptDocument, generatePrivateKey } from "./common/utils";
import { testDnsDid } from "./src/dns-did";

const main = async () => {
  // More information regarding provider and signer, refer https://docs.ethers.io/v5/api/providers/

  // get ropsten provider with etherscan api key provided
  const infuraProvider = new providers.InfuraProvider("ropsten", {
    projectId: process.env.INFURA_API_KEY,
    projectSecret: process.env.INFURA_API_SECRET,
  });

  // get the private key, create wallet/signer with it and connect the wallet to the provider
  const privateKey = await fs.readFile(privateKeyPath, { encoding: "utf-8" });
  const wallet = new Wallet(privateKey);
  // const walletSigner = wallet.connect(ropstenProvider);
  const walletSigner = wallet.connect(infuraProvider);
  console.log({ walletSignerAdress: walletSigner.address });

  // Deploy document store (only once)
  // const documentStore = await deployAndWait("ICA Document Store", walletSigner);

  // NOTE: After document store is deployed, create a DNS txt-record using Open Attestation CLI

  const documentStore: UpgradableDocumentStore = await connect(
    EXISTING_DOCUMENT_STORE.DNSDID, // change this accordingly
    walletSigner
  );
  console.log({ documentStoreAddress: documentStore.address });

  // await testDnsTxt(documentStore);
  await testDnsDid(documentStore);

  /**
   * Test decrypting health cert and save into json file
   */
  // const data = await fs.readFile("./sample-data/encrypted-health-cert.txt", {
  //   encoding: "utf-8",
  // });
  // const encrypted = JSON.parse(data);
  // encrypted.key =
  //   "1a5e93f0c02c8dbbfc27f3d979d582ae7134bffbfd71e71917ce269f796f5044";
  // const decrypted = decryptDocument(encrypted);
  // await fs.writeFile("./sample-data/decrypted-health-cert.json", decrypted);
};

// generatePrivateKey()
main();
