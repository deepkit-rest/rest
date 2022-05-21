import { JwtPayload } from "jsonwebtoken";
import { JwtService } from "src/jwt/jwt.service";
import { RequestSessionUser } from "src/shared/request-session";
import { User } from "src/user/user.entity";

export class AuthTokenService {
  constructor(private jwtService: JwtService) {}

  async signRefresh(user: User): Promise<string> {
    return this.jwtService.sign<AuthTokenPayload>(
      { user: { id: user.id }, type: "refresh" },
      { expiresIn: "60 days" },
    );
  }

  async signAccess(refreshToken: string): Promise<string> {
    const { user } = await this.decodeAndVerify(refreshToken);
    return this.jwtService.sign<AuthTokenPayload>(
      { user, type: "access" },
      { expiresIn: "60 minutes" },
    );
  }

  async decodeAndVerify(token: string): Promise<AuthTokenPayload> {
    return this.jwtService.decodeAndVerify<AuthTokenPayload>(token);
  }
}

export interface AuthTokenPayload extends JwtPayload {
  user: RequestSessionUser;
  type: "access" | "refresh";
}
