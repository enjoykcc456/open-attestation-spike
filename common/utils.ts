import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import util from "util";

import {
  v2,
  wrapDocuments as oaWrapDocuments,
  validateSchema,
  verifySignature,
  SUPPORTED_SIGNING_ALGORITHM,
  signDocument,
  getData,
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
import { UpgradableDocumentStore } from "@govtechsg/document-store/src/contracts/UpgradableDocumentStore";
import { Signer, providers } from "ethers";
import { Pass } from "../sample-data/data";
import AWS from "aws-sdk";
import { encryptDataWithPasswordWithScrypt } from "./encryption";

const awsAccessId = process.env.AWS_ACCESS_ID;
const awsAccessSecret = process.env.AWS_ACCESS_SECRET;
const bucketName = process.env.BUCKET_NAME;

let s3: AWS.S3;

const initS3 = () => {
  if (awsAccessId && awsAccessSecret) {
    s3 = new AWS.S3({
      credentials: {
        accessKeyId: awsAccessId,
        secretAccessKey: awsAccessSecret,
      },
    });
  }
};

initS3();

export const uploadToS3 = async (content: any, key: string) => {
  if (bucketName) {
    const uploadResponse = await s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: content,
      })
      .promise();

    console.log({ uploadResponse });
  }
};

/**
 * Generate private key for wallet, and save to local if path provided
 */
export const generatePrivateKey = async (pathToSave = "") => {
  const id = crypto.randomBytes(32).toString("hex");
  const privateKey = "0x" + id;
  if (pathToSave) {
    const a = await fs.writeFile(path.resolve(pathToSave), privateKey);
    console.log({ a });
  }
  return privateKey;
};

/**
 * Wrap a single document and save locally
 */
export const wrapDocument = async (
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
export const wrapDocuments = async (
  documents: v2.OpenAttestationDocument[],
  saveFolderPath = ""
) => {
  const wrappedDocuments = oaWrapDocuments(documents);
  console.log({ wrappedDocuments });

  if (saveFolderPath) {
    await fs.mkdir(saveFolderPath, { recursive: true });
  }

  for (const wrappedDocument of wrappedDocuments) {
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
  }

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

/**
 * Verify the document to make sure document integrity, status and issuer identity is valid
 */
export const verifyDocument = async (
  document: v2.WrappedDocument,
  provider?: providers.Provider
) => {
  const verify = verificationBuilder(openAttestationVerifiers, {
    network: "ropsten",
    provider,
  });

  const result = await verify(document);
  console.log(
    util.inspect(result, { showHidden: false, depth: null, colors: true })
  );
  console.log(`DOCUMENT_INTEGRITY: ${isValid(result, ["DOCUMENT_INTEGRITY"])}`); // output true
  console.log(`DOCUMENT_STATUS: ${isValid(result, ["DOCUMENT_STATUS"])}`); // output false
  console.log(`ISSUER_IDENTITY: ${isValid(result, ["ISSUER_IDENTITY"])}`);
  console.log(`OVERALL_RESULT: ${isValid(result)}`);
};

/**
 * Encrypt the wrapped document
 */
export const encryptSignedPassDocuments = async (
  documents: v2.SignedWrappedDocument<Pass>[]
) => {
  for (const document of documents) {
    const { verificationUrl, recipient } = getData(document);
    const decodedUrl = new URL(decodeURIComponent(verificationUrl));
    const q = decodedUrl.searchParams.get("q");
    if (q) {
      const {
        payload: { uri },
      } = JSON.parse(q);

      const { key } = JSON.parse(
        decodeURIComponent(decodedUrl.hash.replace("#", ""))
      );
      console.log({ uri, key });

      const encryptedDocument = encryptString(JSON.stringify(document), key);
      const { key: removed, ...remaining } = encryptedDocument;

      const result = await encryptDataWithPasswordWithScrypt(
        "password",
        JSON.stringify(remaining)
      );

      await uploadToS3(
        JSON.stringify(result),
        new URL(uri).pathname.replace("/", "")
      );
    }
  }
};

/**
 * Decrypt the encrypted results back to document
 */
export const decryptDocument = (encryptedResults: IEncryptionResults) => {
  // remember to put back the key before decrypting
  const decryptedDocument = decryptString(encryptedResults);
  return JSON.parse(decryptedDocument);
};

/**
 * Issue document(s) to the document store
 */
export const issueDocuments = async (
  hashToIssue: string | string[],
  documentStore: UpgradableDocumentStore
) => {
  let tx;

  if (Array.isArray(hashToIssue)) {
    // bulk issue is for issuing list of hashes in one transaction where
    // each hash could be a merkle root hash that formed by list of target hashes
    tx = await documentStore.bulkIssue(hashToIssue);
    const receipt = await tx.wait();
    console.log({ receipt });

    for (const hash of hashToIssue) {
      const isIssued = await documentStore.isIssued(hash);
      console.log({ isIssued });
    }
  } else {
    // issue is for issuing of a single hash
    tx = await documentStore.issue(hashToIssue);
    const receipt = await tx.wait();
    console.log({ receipt });
    const isIssued = await documentStore.isIssued(hashToIssue);
    console.log({ isIssued });
  }
};

/**
 * Revoke document(s) to the document store
 */
export const revokeDocuments = async (
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
    console.log({ receipt });
    const isRevoked = await documentStore.isRevoked(hashToRevoke);
    console.log({ isRevoked });
  }
};

/**
 * Consolidate all the documents' target hashes and revoke in 1 transcation
 */
export const revokeOrIssueDocumentsInFolder = async (
  folderPath: string,
  documentStore: UpgradableDocumentStore,
  type: "issue" | "revoke"
) => {
  let hashes: string[] = [];

  const files = await fs.readdir(path.resolve(folderPath));
  console.log({ files });

  for (const file of files) {
    const filePath = path.resolve(folderPath, file);
    const data = await fs.readFile(filePath, { encoding: "utf-8" });
    const document: v2.WrappedDocument = JSON.parse(data);
    const { targetHash } = document.signature;
    hashes.push(`0x${targetHash}`);
  }

  hashes = Array.from<string>(new Set(hashes));
  if (hashes.length < 1) {
    console.log(`No hash to ${type}.`);
    return;
  }

  console.log({ hashes });
  if (type === "issue") {
    await issueDocuments(
      hashes.length === 1 ? hashes[0] : hashes,
      documentStore
    );
  } else {
    await revokeDocuments(
      hashes.length === 1 ? hashes[0] : hashes,
      documentStore
    );
  }
};

/**
 * Sign the wrapped document (DNS-DID)
 */
export const signDocuments = async (
  documents: v2.WrappedDocument[],
  signer: Signer,
  saveFolderPath = ""
) => {
  const signedDocuments: v2.SignedWrappedDocument[] = [];

  if (saveFolderPath) {
    await fs.mkdir(saveFolderPath, { recursive: true });
  }

  for (const document of documents) {
    const signedDocument = await signDocument(
      document,
      SUPPORTED_SIGNING_ALGORITHM.Secp256k1VerificationKey2018,
      signer
    );

    if (saveFolderPath) {
      const filePath = path.resolve(
        saveFolderPath,
        `${crypto.randomBytes(6).toString("hex")}.json`
      );
      console.log(`Writing file to ${filePath}`);
      await fs.writeFile(filePath, JSON.stringify(signedDocument));
      signedDocuments.push(signedDocument);
    }
  }
  return signedDocuments;
};

/**
 * Convert the date to custom ISO string
 */
export const convertToCustomISO = (date: Date) => {
  const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, -1);
};

interface DateAdditionOptions {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}

/**
 * Additional on top of given date
 */
export const addToDate = (
  currentDate: Date,
  {
    year = 0,
    month = 0,
    day = 0,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  }: DateAdditionOptions
) => {
  const newDate = new Date(currentDate);
  year && newDate.setFullYear(newDate.getFullYear() + year);
  month && newDate.setMonth(newDate.getMonth() + month);
  day && newDate.setDate(newDate.getDate() + day);
  hour && newDate.setHours(newDate.getHours() + hour);
  minute && newDate.setMinutes(newDate.getMinutes() + minute);
  second && newDate.setSeconds(newDate.getSeconds() + second);
  millisecond &&
    newDate.setMilliseconds(newDate.getMilliseconds() + millisecond);
  return newDate;
};
