import { v2 } from "@govtechsg/open-attestation";
import fs from "fs";
import path from "path";
import {
  DID,
  DID_PUBLIC_KEY,
  EXISTING_DNS_LOCATION,
  EXISTING_DOCUMENT_STORE,
  PassRecipient,
  PassStatus,
  Sex,
} from "../common/typing";

const ltvpImagePath = path.resolve(__dirname, "../assets/lebron.png");
const stpImagePath = path.resolve(__dirname, "../assets/davis.png");

const base64Encode = (filePath: string) => {
  return fs.readFileSync(filePath, { encoding: "base64" });
};

export enum PassType {
  LTVP = "ltvp",
  STP = "stp",
}

export interface Pass extends v2.OpenAttestationDocument {
  name: string;
  status: PassStatus;
  issuedOn: string;
  expireOn: string;
  recipient: PassRecipient;
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
        type: v2.RevocationType.RevocationStore,
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

  const name = "Immigration & Checkpoints Authority";
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
      revocationLocation: documentStore,
    });
  }

  return {
    name:
      passType === PassType.LTVP ? "Long Term Visit Pass" : "Short Term Pass",
    status: PassStatus.LIVE,
    issuedOn: "2019-05-29T00:00:00+08:00",
    expireOn: "2025-05-29T00:00:00+08:00",
    recipient: {
      name: passType === PassType.LTVP ? "Lebron" : "Davis",
      profileImage:
        passType === PassType.LTVP
          ? base64Encode(ltvpImagePath)
          : base64Encode(stpImagePath),
      fin: "L1234567J",
      dob: "2019-08-18",
      sex: Sex.MALE,
      nationality: "American",
    },
    issuers: [issuer],
    $template: {
      name: passType.toUpperCase(),
      type: v2.TemplateType.EmbeddedRenderer,
      url: "http://localhost:3000",
    },
  };
};
