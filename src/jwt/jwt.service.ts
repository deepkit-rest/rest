import {
  JwtPayload,
  sign,
  SignCallback,
  SignOptions,
  verify,
  VerifyCallback,
} from "jsonwebtoken";

import { JwtConfig } from "./jwt.config";

export class JwtService {
  constructor(private secret: JwtConfig["secret"]) {}

  async sign<Payload extends JwtPayload>(
    payload: Payload,
    options: SignOptions,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const callback: SignCallback = (err, token) =>
        token ? resolve(token) : reject(err);
      sign(payload, this.secret, options, callback);
    });
  }

  async decodeAndVerify<Payload extends JwtPayload>(
    token: string,
  ): Promise<Payload> {
    return new Promise((resolve, reject) => {
      const callback: VerifyCallback = (err, payload) =>
        payload ? resolve(payload as Payload) : reject(err);
      verify(token, this.secret, callback);
    });
  }
}
