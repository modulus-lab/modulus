import * as jose from "jose";
import keys from "./keys.json" with { type: "json" };

export const alg = "RS256";
export const kid = `default`;

export const privateKey: CryptoKey = (await jose.importJWK(
  keys.privateKey,
  alg,
)) as CryptoKey;
export const publicKey: CryptoKey = (await jose.importJWK(
  keys.publicKey,
  alg,
)) as CryptoKey;

const publicJWK = await jose.exportJWK(publicKey);
publicJWK.kid = kid;
publicJWK.use = "sig";
publicJWK.alg = alg;

export const jwks = {
  keys: [publicJWK],
};
