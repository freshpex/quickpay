import { z } from "zod";
import { DomainError } from "../../api/src/shared/errors";
function validationIssues(
  issues: z.ZodError["issues"],
  prefix: PropertyKey[] = [],
): { path: string; code: string }[] {
  return issues.flatMap((issue) =>
    issue.code === "invalid_union"
      ? issue.errors.flatMap((branch) =>
          validationIssues(branch, [...prefix, ...issue.path]),
        )
      : [
          {
            path: [...prefix, ...issue.path].map(String).join("."),
            code: issue.code,
          },
        ],
  );
}
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
          issues: validationIssues(error.issues).slice(0, 12),
        }
      : {}),
  };
}
