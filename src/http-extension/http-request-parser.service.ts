import { HttpRequest } from "@deepkit/http";
import formidable from "formidable";
import qs from "qs";

export class HttpRequestParser {
  parseUrl(url: string): { path: string; queries: object } {
    const indexOfQueryMark = url.indexOf("?");
    const path = url.slice(0, indexOfQueryMark);
    const queriesStr = url.slice(indexOfQueryMark + 1);
    const queries = qs.parse(queriesStr);
    return { path, queries };
  }

  async parseBody(request: HttpRequest): Promise<object> {
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
