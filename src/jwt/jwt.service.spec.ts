import { JsonWebTokenError, JwtPayload } from "jsonwebtoken";

import { JwtService } from "./jwt.service";

describe("JwtService", () => {
  let service: JwtService;

  beforeEach(() => {
    service = new JwtService("secret");
  });

  it("should work", async () => {
    type Payload = JwtPayload & { foo: string };
    const token = await service.sign<Payload>({ foo: "bar" }, {});
    const decoded = service.decode<Payload>(token);
    expect(decoded.foo).toBe("bar");
    expect(decoded.iat).toBeDefined();
  });

  it("should fail when token is invalid", async () => {
    expect(() => service.decode("invalid")).toThrow(JsonWebTokenError);
  });
});
