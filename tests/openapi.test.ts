import { expect, it } from "vitest";
import { openapi } from "../apps/api/src/shared/infrastructure/openapi";
type ObjectSchema = {
  type: string;
  required: string[];
  properties: Record<
    string,
    { type: string; writeOnly?: boolean; pattern?: string }
  >;
};
function schema(path: string) {
  const document = openapi();
  const body = document.paths[path].post.requestBody as {
    content: { "application/json": { schema: ObjectSchema } };
  };
  return body.content["application/json"].schema;
}
it("documents the required PIN setup fields while keeping the old PIN optional", () => {
  const value = schema("/security/pin");
  expect(value.required).toHaveLength(3);
  expect(value.required).toContain("password");
  expect(value.required).toContain("newPin");
  expect(value.required).toContain("confirmPin");
  expect(value.required).not.toContain("currentPin");
  for (const field of Object.values(value.properties))
    expect(field.writeOnly).toBe(true);
  expect(new RegExp(value.properties.newPin.pattern!).test("1234")).toBe(false);
  expect(new RegExp(value.properties.newPin.pattern!).test("572904")).toBe(
    true,
  );
});
it("documents password-only reset requests and optional code confirmation fields", () => {
  const value = schema("/security/pin/reset");
  expect(value.required).toHaveLength(1);
  expect(value.required).toContain("password");
  expect(value.properties.code.writeOnly).toBe(true);
  expect(value.properties.newPin.writeOnly).toBe(true);
  expect(value.properties.confirmPin.writeOnly).toBe(true);
});
