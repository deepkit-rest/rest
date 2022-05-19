import { createHttpError } from "@deepkit/http";

export class HttpUnauthorizedError extends createHttpError(
  401,
  "Unauthorized",
) {}
