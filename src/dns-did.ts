import { promises as fs } from "fs";
import path from "path";
import { UpgradableDocumentStore } from "@govtechsg/document-store/src/contracts/UpgradableDocumentStore";
import {
  v2,
  signDocument,
  SUPPORTED_SIGNING_ALGORITHM,
} from "@govtechsg/open-attestation";
import {
  encryptDocument,
  revokeDocumentsInFolder,
  signDocuments,
  verifyDocument,
  wrapDocuments,
} from "../common/utils";
import { getPassData, PassType } from "../sample-data/data";
import { utils, providerType, ProviderDetails } from "@govtechsg/oa-verify";

const WRAPPED_DOCS_PATH = path.resolve(
  __dirname,
  "../sample-data/dns-did/wrapped"
);
const SIGNED_DOCS_PATH = path.resolve(
  __dirname,
  "../sample-data/dns-did/signed"
);
const VERIFY_DOC_PATH = path.resolve(
  __dirname,
  "../sample-data/dns-did/signed/546cc4c187d9.json"
);

const data = [
  getPassData(v2.IdentityProofType.DNSDid, PassType.LTVP),
  getPassData(v2.IdentityProofType.DNSDid, PassType.STP),
];

export const testDnsDid = async (documentStore: UpgradableDocumentStore) => {
  try {
    // Wrap documents
    const { wrappedDocuments, merkleRoot } = await wrapDocuments(
      data,
      WRAPPED_DOCS_PATH
    );

    // Sign wrapped documents
    if (wrappedDocuments.length > 0 && merkleRoot) {
      const { signer } = documentStore;
      signDocuments(wrappedDocuments, signer, SIGNED_DOCS_PATH);
    }

    // Revokation of documents
    // await revokeDocumentsInFolder(SIGNED_DOCS_PATH, documentStore);

    // Verfication of documents
    // const signedWrappedDocument: v2.SignedWrappedDocument = JSON.parse(
    //   await fs.readFile(VERIFY_DOC_PATH, {
    //     encoding: "utf-8",
    //   })
    // );
    // verifyDocument(signedWrappedDocument, documentStore.provider);
  } catch (err) {
    console.log(err);
  }
};
