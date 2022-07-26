import { HttpUnauthorizedError } from "@deepkit/http";
import md5 from "md5";
import { ExpirableMap } from "src/common/map";
import { create as createCaptcha } from "svg-captcha";

export class AuthCaptchaService {
  private map = new ExpirableMap<string, string>(1000 * 60, 10000);

  request(): [key: string, svg: string] {
    const { data: svg, text: result } = createCaptcha();
    const key = md5(svg);
    this.map.set(key, result);
    return [key, svg];
  }

  verify(key: string, result: string): void {
    const resultExpected = this.map.get(key);
    if (result !== resultExpected)
      throw new HttpUnauthorizedError("Invalid captcha");
  }
}
