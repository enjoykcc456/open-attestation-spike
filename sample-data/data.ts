import { v2 } from "@govtechsg/open-attestation";
import fs from "fs";
import { v4 as uuid } from "uuid";
import path from "path";
import {
  DID,
  DID_PUBLIC_KEY,
  EXISTING_DNS_LOCATION,
  EXISTING_DOCUMENT_STORE,
  PAYLOAD_URL,
  PassRecipient,
  PassStatus,
  Sex,
  VERIFICATION_URL,
  OCSP_VERIFICATION_URL,
  RENDERER_URL,
} from "../common/typing";
import crypto from "crypto";
import { generateEncryptionKey } from "@govtechsg/oa-encryption";
import { addToDate, convertToCustomISO } from "../common/utils";

// const ltvpImagePath = path.resolve(__dirname, "../assets/lebron.png");
const ltvpImagePath = path.resolve(__dirname, "../assets/joey-chan.png");

const base64Encode = (filePath: string) => {
  return fs.readFileSync(filePath, { encoding: "base64" });
};

const getVerificationUrlQuery = () => {
  return encodeURIComponent(
    JSON.stringify({
      type: "DOCUMENT",
      payload: {
        uri: `${PAYLOAD_URL}/${crypto.randomBytes(6).toString("hex")}`,
        permittedActions: ["VIEW", "STORE"],
      },
    })
  );
};

const getVerificationUrl = () => {
  return `${VERIFICATION_URL}?q=${getVerificationUrlQuery()}#${encodeURIComponent(
    JSON.stringify({
      key: generateEncryptionKey(),
    })
  )}`;
};

export enum PassType {
  LTVP = "ltvp",
  WP = "wp",
}

export interface Pass extends v2.OpenAttestationDocument {
  id: string;
  name: string;
  status: PassStatus;
  issuedOn: string;
  expireOn: string;
  recipient: PassRecipient;
  employer?: string;
  sector?: string;
  verificationUrl: string;
  $template: v2.TemplateObject;
}
interface GetIssuer {
  type: v2.IdentityProofType;
  name: string;
  location: string;
  documentStore?: string;
  id?: string;
  key?: string;
  revocationLocation?: string;
}

export const getIssuer = ({
  type,
  name,
  location,
  documentStore,
  id,
  key,
  revocationLocation,
}: GetIssuer): v2.Issuer => {
  if (type === v2.IdentityProofType.DNSTxt && documentStore) {
    return {
      name,
      documentStore,
      identityProof: {
        type: v2.IdentityProofType.DNSTxt,
        location,
      },
    };
  } else {
    return {
      id,
      name,
      revocation: {
        type: v2.RevocationType.OcspResponder,
        location: revocationLocation,
      },
      identityProof: {
        type: v2.IdentityProofType.DNSDid,
        location,
        key,
      },
    };
  }
};

export const getPassData = (
  type: v2.IdentityProofType,
  passType: PassType
): Pass => {
  let issuer: v2.Issuer;

  const name =
    passType === PassType.LTVP
      ? "Immigration & Checkpoints Authority"
      : "Ministry Of Manpower";
  const location =
    type === v2.IdentityProofType.DNSTxt
      ? EXISTING_DNS_LOCATION.DNSTXT
      : EXISTING_DNS_LOCATION.DNSDID;
  const documentStore =
    type === v2.IdentityProofType.DNSTxt
      ? EXISTING_DOCUMENT_STORE.DNSTXT
      : EXISTING_DOCUMENT_STORE.DNSDID;

  if (type === v2.IdentityProofType.DNSTxt) {
    issuer = getIssuer({ type, name, location, documentStore });
  } else {
    issuer = getIssuer({
      type,
      name,
      location,
      id: DID,
      key: DID_PUBLIC_KEY,
      revocationLocation: OCSP_VERIFICATION_URL,
    });
  }

  const issueDate = new Date();

  const doc: Pass = {
    id: uuid(),
    name: passType === PassType.LTVP ? "Long Term Visit Pass" : "Work Permit",
    status: PassStatus.LIVE,
    issuedOn: convertToCustomISO(issueDate),
    expireOn: convertToCustomISO(addToDate(issueDate, { year: 5 })),
    recipient: {
      name: "Joey Chan Hsiao An (Zeng Xiao An)",
      profileImage: base64Encode(ltvpImagePath),
      fin: "G8765456A",
      dob: convertToCustomISO(new Date(1995, 8, 18)),
      sex: Sex.FEMALE,
      nationality: "Indonesia",
    },
    verificationUrl: getVerificationUrl(),
    issuers: [issuer],
    $template: {
      name: passType.toUpperCase(),
      type: v2.TemplateType.EmbeddedRenderer,
      url: RENDERER_URL,
    },
  };

  if (passType === PassType.WP) {
    doc.employer = "123 Manufacturing Pte Ltd";
    doc.sector = "Construction";
  }

  return doc;
};
