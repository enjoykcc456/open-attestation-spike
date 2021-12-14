import { promises as fs } from "fs";
import path from "path";
import { UpgradableDocumentStore } from "@govtechsg/document-store/src/contracts/UpgradableDocumentStore";
import {
  v2,
  signDocument,
  SUPPORTED_SIGNING_ALGORITHM,
} from "@govtechsg/open-attestation";
import {
  encryptSignedPassDocuments,
  revokeOrIssueDocumentsInFolder,
  signDocuments,
  updateOA,
  verifyDocument,
  wrapDocuments,
} from "../common/utils";
import { getPassData, Pass, PassType } from "../sample-data/data";
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
  "../sample-data/dns-did/signed/99626f04b4cf.json"
);

const data = [
  getPassData(v2.IdentityProofType.DNSDid, PassType.LTVP),
  // getPassData(v2.IdentityProofType.DNSDid, PassType.LTVP),
];

export const testDnsDid = async (documentStore: UpgradableDocumentStore) => {
  try {
    /**
     * Wrap documents
     */
    const { wrappedDocuments, merkleRoot } = await wrapDocuments(
      data,
      WRAPPED_DOCS_PATH
    );

    /**
     * Sign wrapped documents
     */
    if (wrappedDocuments.length > 0 && merkleRoot) {
      const { signer } = documentStore;
      console.log(signer);
      const signedDocuments = await signDocuments(
        wrappedDocuments,
        signer,
        SIGNED_DOCS_PATH
      );
      await encryptSignedPassDocuments(
        signedDocuments as v2.SignedWrappedDocument<Pass>[]
      );
    }

    /**
     * Test updating fields in oa files
     */
    // await updateOA(SIGNED_DOCS_PATH, documentStore);

    /**
     * Revokation of documents
     */
    // await revokeOrIssueDocumentsInFolder(
    //   SIGNED_DOCS_PATH,
    //   documentStore,
    //   "revoke"
    // );

    /**
     * Verfication of documents
     */
    // const signedWrappedDocument: v2.SignedWrappedDocument = JSON.parse(
    //   await fs.readFile(VERIFY_DOC_PATH, {
    //     encoding: "utf-8",
    //   })
    // );
    // verifyDocument(signedWrappedDocument, documentStore.provider);

    // Encryption of documents
  } catch (err) {
    console.log(err);
  }
};
