import { v2 } from "@govtechsg/open-attestation";
import { longTermVisitPass } from "./ltvp";
import { shortTermPass } from "./stp";

export const data: v2.OpenAttestationDocument[] = [
  longTermVisitPass,
  shortTermPass,
];
