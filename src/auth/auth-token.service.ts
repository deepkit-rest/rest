import {
  JwtPayload,
  sign,
  SignCallback,
  verify,
  VerifyCallback,
} from "jsonwebtoken";
import { User } from "src/user/user.entity";

import { AuthConfig } from "./auth.module";

export class AuthTokenService {
  constructor(private secret: AuthConfig["secret"]) {}

  async sign(user: User): Promise<string> {
    return new Promise((resolve, reject) => {
      const { uuid } = user;
      const callback: SignCallback = (err, token) =>
        token ? resolve(token) : reject(err);
      sign({ uuid }, this.secret, callback);
    });
  }

  async decodeAndVerify(token: string): Promise<AuthTokenPayload> {
    return new Promise((resolve, reject) => {
      const callback: VerifyCallback = (err, payload) =>
        payload ? resolve(payload as AuthTokenPayload) : reject(err);
      verify(token, this.secret, callback);
    });
  }
}

export interface AuthTokenPayload extends JwtPayload {
  user: Pick<User, "uuid">; // TODO: determine user fields to store
}
