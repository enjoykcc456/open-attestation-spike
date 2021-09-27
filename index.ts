import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

import {
  v2,
  wrapDocument as oaWrapDocument,
  wrapDocuments as oaWrapDocuments,
  WrappedDocument,
  validateSchema,
  verifySignature,
} from "@govtechsg/open-attestation";
import {
  encryptString,
  decryptString,
  IEncryptionResults,
} from "@govtechsg/oa-encryption";
import {
  isValid,
  openAttestationVerifiers,
  verificationBuilder,
} from "@govtechsg/oa-verify";
import { LongTermVisitPass, longTermVisitPass } from "./sample-data/data/ltvp";
import { ShortTermPass, shortTermPass } from "./sample-data/data/stp";
import { deployAndWait, connect } from "@govtechsg/document-store";
import { Wallet, providers } from "ethers";
import { UpgradableDocumentStore } from "@govtechsg/document-store/src/contracts/UpgradableDocumentStore";
import { data } from "./sample-data/data";

const privateKeyPath = "./keys/privateKey.txt";
const ETHERSCAN_API_KEY = "7P3R87MZDNAX782RB8QSMIDWXWQMKJYF8G";
const EXISTING_DOCUMENT_STORE = "0x8c9460deDCBe881ddaE1681c3aa48d6eEC723160";
const WRAPPED_DOCS_PATH = "./sample-data/wrapped";
const DOCS_TO_REVOKE_PATH = "./sample-data/to-revoke";

const ltvp = longTermVisitPass as LongTermVisitPass;
const stp = shortTermPass as ShortTermPass;

/**
 * Generate private key for wallet, and save to local if path provided
 */
const generatePrivateKey = async (pathToSave = "") => {
  const id = crypto.randomBytes(32).toString("hex");
  const privateKey = "0x" + id;
  if (pathToSave) {
    const a = await fs.writeFile(path.resolve(pathToSave), privateKey);
    console.log({ a });
  }
  return privateKey;
};

const wrapDocument = async (
  document: v2.OpenAttestationDocument,
  saveFolderPath: string
) => {
  const { wrappedDocuments, merkleRoot } = await wrapDocuments(
    [document],
    saveFolderPath
  );
  return {
    wrappedDocument: wrappedDocuments[0],
    merkleRoot,
  };
};

/**
 * Wrapp documents (list of oa documents) and save locally
 */
const wrapDocuments = async (
  documents: v2.OpenAttestationDocument[],
  saveFolderPath = ""
) => {
  const wrappedDocuments = oaWrapDocuments(documents);
  console.log({ wrappedDocuments });

  if (saveFolderPath) {
    await fs.mkdir(saveFolderPath, { recursive: true });
  }

  wrappedDocuments.forEach(async (wrappedDocument) => {
    // validate schema and verifySignaure, do something if failed
    console.log(`Is document schema valid: ${validateSchema(wrappedDocument)}`);
    console.log(
      `Is signature of the document matches the content in the document: ${verifySignature(
        wrappedDocument
      )}`
    );

    if (saveFolderPath) {
      const filePath = path.resolve(
        saveFolderPath,
        `${crypto.randomBytes(6).toString("hex")}.json`
      );
      console.log(`Writing file to ${filePath}`);
      await fs.writeFile(filePath, JSON.stringify(wrappedDocument));
    }
  });

  const result: {
    wrappedDocuments: v2.WrappedDocument[];
    merkleRoot?: string;
  } = {
    wrappedDocuments,
  };

  if (wrappedDocuments.length > 0) {
    result.merkleRoot = `0x${wrappedDocuments[0].signature.merkleRoot}`;
  }

  return result;
};

const verifyDocument = async (document: v2.WrappedDocument) => {
  const verify = verificationBuilder(openAttestationVerifiers, {
    network: "ropsten",
  });

  const result = await verify(document);
  console.log(`DOCUMENT_INTEGRITY: ${isValid(result, ["DOCUMENT_INTEGRITY"])}`); // output true
  console.log(`DOCUMENT_STATUS: ${isValid(result, ["DOCUMENT_STATUS"])}`); // output false
  console.log(`ISSUER_IDENTITY: ${isValid(result, ["ISSUER_IDENTITY"])}`);
  console.log(`OVERALL_RESULT: ${isValid(result)}`);
};

const encryptDocument = (document: v2.WrappedDocument) => {
  // before passing the ciphertext, remove the key
  const encryptedDocument = encryptString(JSON.stringify(document));
  console.log(encryptedDocument);
};

const decryptDocument = (encryptedResults: IEncryptionResults) => {
  // remember to put back the key before decrypting
  const decryptedDocument = decryptString(encryptedResults);
  console.log(JSON.parse(decryptedDocument));
};

const issueMerkleRoot = async (
  hashToIssue: string | string[],
  documentStore: UpgradableDocumentStore
) => {
  let tx;

  if (Array.isArray(hashToIssue)) {
    // bulk issue is for issuing list of hashes in one transaction where
    // each hash could be a merkle root hash that formed by list of target hashes
    tx = await documentStore.bulkIssue(hashToIssue);
    const receipt = await tx.wait();
    console.log(receipt);

    for (const hash of hashToIssue) {
      const isIssued = await documentStore.isIssued(hash);
      console.log({ isIssued });
    }
  } else {
    // issue is for issuing of a single hash
    tx = await documentStore.issue(hashToIssue);
    const receipt = await tx.wait();
    console.log(receipt);
    const isIssued = await documentStore.isIssued(hashToIssue);
    console.log({ isIssued });
  }
};

const revokeMerkleRoot = async (
  hashToRevoke: string | string[],
  documentStore: UpgradableDocumentStore
) => {
  let tx;

  if (Array.isArray(hashToRevoke)) {
    tx = await documentStore.bulkRevoke(hashToRevoke);
    const receipt = await tx.wait();
    console.log({ receipt });

    for (const hash of hashToRevoke) {
      const isRevoked = await documentStore.isRevoked(hash);
      console.log({ isRevoked });
    }
  } else {
    tx = await documentStore.revoke(hashToRevoke);
    const receipt = await tx.wait();
    console.log(receipt);
    const isRevoked = await documentStore.isRevoked(hashToRevoke);
    console.log({ isRevoked });
  }
};

const revokeDocumentsInFolder = async (
  folderPath: string,
  documentStore: UpgradableDocumentStore
) => {
  const merkleRoots = new Set<string>();

  const files = await fs.readdir(path.resolve(folderPath));
  console.log({ files });

  for (const file of files) {
    const filePath = path.resolve(folderPath, file);
    const data = await fs.readFile(filePath, { encoding: "utf-8" });
    const document: v2.WrappedDocument = JSON.parse(data);
    const { merkleRoot } = document.signature;
    merkleRoots.add(`0x${merkleRoot}`);
  }

  const hashesToRevoke = Array.from<string>(merkleRoots);
  console.log({ hashesToRevoke });
  await revokeMerkleRoot(hashesToRevoke, documentStore);
};

const main = async () => {
  // More information regarding provider and signer, refer https://docs.ethers.io/v5/api/providers/

  // ===========================================================================
  // Connection to provider and deployment of document store
  // ===========================================================================
  // get ropsten provider with etherscan api key provided
  const ropstenProvider = new providers.EtherscanProvider(
    "ropsten",
    ETHERSCAN_API_KEY
  );

  // get the private key, create wallet/signer with it and connect the wallet to the provider
  const privateKey = await fs.readFile(privateKeyPath, { encoding: "utf-8" });
  const wallet = new Wallet(privateKey);
  const walletSigner = wallet.connect(ropstenProvider);
  console.log({ walletSignerAdress: walletSigner.address });

  // Deploy document store (only once)
  // const documentStore = await deployAndWait("ICA Document Store", walletSigner);

  const documentStore: UpgradableDocumentStore = await connect(
    EXISTING_DOCUMENT_STORE,
    walletSigner
  );
  console.log({ documentStoreAddress: documentStore.address });

  // =========================================================================
  // Wrap documents
  // =========================================================================
  // const { wrappedDocuments, merkleRoot } = await wrapDocuments(
  //   data,
  //   WRAPPED_DOCS_PATH
  // );

  // ===========================================================================
  // Issuance of wrapped documents
  // ===========================================================================
  // if (wrappedDocuments.length > 0 && merkleRoot) {
  //   await issueMerkleRoot(merkleRoot, documentStore);
  // }

  // ===========================================================================
  // Revokation of documents
  // ===========================================================================
  // await revokeDocumentsInFolder(DOCS_TO_REVOKE_PATH, documentStore);

  // ===========================================================================
  // Verfication and encryption of documents
  // ===========================================================================
  // verifyDocument(wrappedDocument);
  // encryptDocument();
};

// generatePrivateKey("./keys/privatekey.txt");

main();
