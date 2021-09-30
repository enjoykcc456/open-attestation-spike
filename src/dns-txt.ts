import { promises as fs } from "fs";
import path from "path";
import { UpgradableDocumentStore } from "@govtechsg/document-store/src/contracts/UpgradableDocumentStore";
import { v2 } from "@govtechsg/open-attestation";
import {
  encryptDocument,
  issueDocuments,
  revokeOrIssueDocumentsInFolder,
  verifyDocument,
  wrapDocuments,
} from "../common/utils";
import { getPassData, PassType } from "../sample-data/data";

const WRAPPED_DOCS_PATH = path.resolve(
  __dirname,
  "../sample-data/dns-txt/wrapped"
);
const VERIFY_DOC_PATH = path.resolve(
  __dirname,
  "../sample-data/dns-txt/wrapped/23c8661b08ab.json"
);

const data = [
  getPassData(v2.IdentityProofType.DNSTxt, PassType.LTVP),
  getPassData(v2.IdentityProofType.DNSTxt, PassType.STP),
];

export const testDnsTxt = async (documentStore: UpgradableDocumentStore) => {
  try {
    // Wrap documents
    const { wrappedDocuments, merkleRoot } = await wrapDocuments(
      data,
      WRAPPED_DOCS_PATH
    );

    // Issuance of wrapped documents
    if (wrappedDocuments.length > 0 && merkleRoot) {
      await issueDocuments(merkleRoot, documentStore);
    }

    // Revokation of documents
    // await revokeDocumentsInFolder(WRAPPED_DOCS_PATH, documentStore);
        // await revokeOrIssueDocumentsInFolder(
    //   WRAPPED_DOCS_PATH,
    //   documentStore,
    //   "issue"
    // );

    // Verfication of documents
    //   const wrappedDocument: v2.WrappedDocument = JSON.parse(
    //     await fs.readFile(VERIFY_DOC_PATH, {
    //       encoding: "utf-8",
    //     })
    //   );
    // verifyDocument(wrappedDocument);

    // Encryption of documents
    // encryptDocument(wrappedDocument);
  } catch (err) {
    console.log(err);
  }
};
