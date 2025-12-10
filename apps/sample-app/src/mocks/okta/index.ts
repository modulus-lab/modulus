import express from "express";
import * as jose from "jose";
import { alg, jwks, kid, privateKey, publicKey } from "./keys.ts";

const router = express.Router();

router.prototype.name = "Okta OAuth";
router.prototype.desc = "Mocks OAuth 2.0 flow supporting @okta/react SDK";
router.prototype.defaultResponse = "auth_success";
router.prototype.responses = [
  {
    id: "auth_success",
    name: "success",
  },
  {
    id: "auth_error",
    name: "error",
  },
  {
    id: "auth_error_user_not_assigned",
    name: "user not assigned",
  },
];

router.get("/.well-known/openid-configuration", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const openidConfig = {
    issuer: `${baseUrl}/api/mocks/okta`,
    authorization_endpoint: `${baseUrl}/api/mocks/okta/oauth2/v1/authorize`,
    token_endpoint: `${baseUrl}/api/mocks/okta/oauth2/v1/token`,
    jwks_uri: `${baseUrl}/api/mocks/okta/oauth2/v1/keys`,
    response_types_supported: [
      "code",
      "token",
      "id_token",
      "code id_token",
      "code token",
      "id_token token",
      "code id_token token",
    ],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: [alg],
    grant_types_supported: ["authorization_code", "implicit", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
  };

  res.json(openidConfig);
});

router.get("/oauth2/v1/keys", (_req, res) => {
  res.json(jwks);
});

router.post("/oauth2/v1/token", async (req, res) => {
  try {
    const { code, client_id } = req.body;
    const username = code.split("_")[2];

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const issuer = `${baseUrl}/api/mocks/okta`;
    const now = Math.floor(Date.now() / 1000);
    const subject = username;

    const payload: any = {
      sub: subject,
      name: `Mock User ${subject}`,
      email: `${subject}@mock.user`,
      email_address: `${subject}@mock.user`,
      preferred_username: subject,
      groups: ["Everyone", "carehub-project-admin1"],
    };

    const accessToken = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: alg, kid, typ: "JWT" })
      .setIssuedAt(now)
      .setIssuer(issuer)
      .setAudience("api://default")
      .setExpirationTime("1h")
      .sign(privateKey);

    const idToken = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: alg, kid, typ: "JWT" })
      .setIssuedAt(now)
      .setIssuer(issuer)
      .setAudience(client_id)
      .setExpirationTime("1h")
      .sign(privateKey);

    const refreshToken = await new jose.SignJWT({
      sub: subject,
      token_type: "refresh",
    })
      .setProtectedHeader({ alg: alg, kid, typ: "JWT" })
      .setIssuedAt(now)
      .setIssuer(issuer)
      .setAudience(client_id)
      .setExpirationTime("30d")
      .sign(privateKey);

    const tokenResponse = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      id_token: idToken,
      refresh_token: refreshToken,
    };

    res.json(tokenResponse);
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Failed to generate token",
    });
  }
});

router.post("/oauth2/v1/introspect", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        active: false,
        error: "token is required",
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const issuer = `${baseUrl}/api/mocks/okta`;

    const { payload } = await jose.jwtVerify(token, publicKey, {
      issuer: issuer,
    });

    res.json({
      active: true,
      ...payload,
    });
  } catch (error) {
    res.json({
      active: false,
    });
  }
});

export default router;
