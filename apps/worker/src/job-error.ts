import { z } from "zod";
import { DomainError } from "../../api/src/shared/errors";
// Provider payloads, customer data, credentials and validation input stay out of logs.
export function jobError(error: unknown) {
  return {
    code:
      error instanceof DomainError
        ? error.code
        : error instanceof Error
          ? error.name
          : "Error",
    ...(error instanceof z.ZodError
      ? {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
          })),
        }
      : {}),
  };
}
