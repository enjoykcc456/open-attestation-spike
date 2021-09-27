import { v2 } from "@govtechsg/open-attestation";
import fs from "fs";
import { PassRecipient, PassStatus, Sex } from "../../common/typing";

const imagePath = "./assets/davis.png";
const base64Encode = (filePath: string) => {
  return fs.readFileSync(filePath, { encoding: "base64" });
};

export interface ShortTermPass extends v2.OpenAttestationDocument {
  name: string;
  status: PassStatus;
  issuedOn: string;
  expireOn: string;
  recipient: PassRecipient;
  $template: v2.TemplateObject;
}

export const shortTermPass: ShortTermPass = {
  name: "Short Term Pass",
  status: PassStatus.LIVE,
  issuedOn: "2019-05-29T00:00:00+08:00",
  expireOn: "2025-05-29T00:00:00+08:00",
  recipient: {
    name: "Davis",
    profileImage: base64Encode(imagePath),
    fin: "L3334444J",
    dob: "2019-08-18",
    sex: Sex.MALE,
    nationality: "American",
  },
  issuers: [
    {
      name: "Immigration & Checkpoints Authority",
      documentStore: "0x8c9460deDCBe881ddaE1681c3aa48d6eEC723160",
      identityProof: {
        type: v2.IdentityProofType.DNSTxt,
        location: "uncertain-moccasin-cattle.sandbox.openattestation.com",
      },
    },
  ],
  $template: {
    name: "STP",
    type: v2.TemplateType.EmbeddedRenderer,
    url: "http://localhost:3000",
  },
};
