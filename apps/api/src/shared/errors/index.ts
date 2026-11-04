export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export class ConfigurationError extends Error {
  constructor(public fields: string[]) {
    super("Server configuration is invalid.");
    this.name = "ConfigurationError";
  }
}
export function assert(
  condition: unknown,
  code: string,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new DomainError(code, message, status);
}
