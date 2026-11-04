import { DomainError } from "../../../../shared/errors";
export interface IdentityVerificationProvider {
  initiate(
    userId: string,
    consentReference: string,
  ): Promise<{ reference: string; hostedUrl: string }>;
  verify(reference: string): Promise<{
    reference: string;
    status: "pending" | "verified" | "rejected";
  }>;
}
export async function requestIdentityVerification(
  _userId: string,
  _consentReference: string,
): ReturnType<IdentityVerificationProvider["initiate"]> {
  throw new DomainError(
    "VERIFICATION_UNAVAILABLE",
    "Identity verification is not available yet. Contact support for help.",
    503,
  );
}
