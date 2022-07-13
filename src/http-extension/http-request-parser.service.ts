import { HttpRequest } from "@deepkit/http";
import formidable from "formidable";
import qs from "qs";

export class HttpRequestParser {
  parseUrl(url: string): [path: string, queries: Record<string, unknown>] {
    const indexOfQueryMark = url.indexOf("?");
    const path = url.slice(0, indexOfQueryMark);
    const queriesStr = url.slice(indexOfQueryMark + 1);
    const queries = qs.parse(queriesStr);
    return [path, queries];
  }

  parsePath(pathSchema: string, path: string): Record<string, unknown> {
    const regExp = pathSchema.replace(
      /:(\w+)/gu,
      (_, name) => `(?<${name}>[^/]+)`,
    );
    const match = path.match(regExp);
    return match?.groups ?? {};
  }

  async parseBody(request: HttpRequest): Promise<Record<string, unknown>> {
    const form = formidable({
      multiples: true,
      hashAlgorithm: "sha1",
      enabledPlugins: ["octetstream", "querystring", "json"],
    });
    return new Promise((resolve, reject) => {
      form.parse(request, (err, fields, files) =>
        err ? reject(err) : resolve({ ...fields, ...files }),
      );
    });
  }
}
