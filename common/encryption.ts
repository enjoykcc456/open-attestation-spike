import {
  randomBytes,
  createCipheriv,
  scrypt,
  CipherCCMTypes,
  CipherGCMTypes,
} from "crypto";
import { ENCRYPTION_CONFIG } from "../common/typing";

/**
 * 1. Buffer to string in hex
 *    - <Buffer instance>.toString('hex')
 * 2. Hex string to Buffer
 *    - Buffer.from(<stringHex>, 'hex')
 * 3. Hex string to array buffer
 *    - Uint8Array.from(Buffer.from(<stringHex>, 'hex'))
 * 4. Array buffer to hex string
 *    - Buffer.from(<arrayBuffer>).toString('hex)
 */

interface EncryptionResult {
  cipherText: string;
  iv: string;
  tag?: string;
}

const isCipherGCM = (
  algorithm: CipherCCMTypes | CipherGCMTypes
): algorithm is CipherGCMTypes => {
  return (
    (algorithm as CipherGCMTypes) === "aes-128-gcm" ||
    (algorithm as CipherGCMTypes) === "aes-192-gcm" ||
    (algorithm as CipherGCMTypes) === "aes-256-gcm"
  );
};

export const encrypt = (
  key: Buffer,
  plainText: string,
  algorithm: CipherCCMTypes | CipherGCMTypes
): EncryptionResult => {
  const iv = randomBytes(16);

  if (isCipherGCM(algorithm)) {
    const cipher = createCipheriv(algorithm, key, iv);
    let cipherText = cipher.update(plainText, "utf8", "base64");
    cipherText += cipher.final("base64");
    const tag = cipher.getAuthTag();
    return {
      cipherText,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  }

  const cipher = createCipheriv(algorithm, key, iv);
  let cipherText = cipher.update(plainText, "utf8", "base64");
  cipherText += cipher.final("base64");
  return {
    cipherText,
    iv: iv.toString("base64"),
  };
};

export const encryptDataWithPasswordWithScrypt = async (
  password: string,
  data: string
): Promise<EncryptionResult & { salt: string }> => {
  const { dkLen, N, r, p } = ENCRYPTION_CONFIG;
  const userPassword = Uint8Array.from(
    Buffer.from(password.normalize("NFKC"), "base64")
  );
  const salt = randomBytes(32);

  const promise = new Promise<EncryptionResult>((resolve) => {
    scrypt(userPassword, salt, dkLen, { N, r, p }, (err, derivedKey) => {
      if (err) {
        throw err;
      }
      resolve(encrypt(derivedKey, data, ENCRYPTION_CONFIG.algorithm));
    });
  });
  const result = await promise;
  return { ...result, salt: salt.toString("base64") };
};
