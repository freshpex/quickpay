const money = {
  type: "string",
  pattern: "^[1-9][0-9]{0,11}$",
  description: "Integer kobo. NGN only. Never a floating-point naira value.",
};
export const financialSchemas = {
  Money: money,
  Deposit: {
    type: "object",
    required: ["amount", "pin"],
    properties: {
      amount: money,
      pin: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
    },
  },
  Withdrawal: {
    type: "object",
    required: ["amount", "bankCode", "accountNumber", "validationId", "pin"],
    properties: {
      amount: money,
      bankCode: { type: "string" },
      accountNumber: { type: "string", pattern: "^[0-9]{10}$" },
      validationId: { type: "string", format: "uuid" },
      pin: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
    },
  },
  Payment: {
    type: "object",
    required: ["amount", "serviceId", "beneficiary", "pin"],
    properties: {
      amount: money,
      serviceId: { type: "string" },
      beneficiary: { type: "string" },
      plan: { type: "string" },
      phone: {
        type: "string",
        description: "Nigerian mobile, normalized to +234",
      },
      validationId: { type: "string", format: "uuid" },
      pin: { type: "string", pattern: "^[0-9]{6}$", writeOnly: true },
    },
  },
  Transaction: {
    type: "object",
    required: ["id", "amount", "fee", "currency", "status", "reference"],
    properties: {
      id: { type: "string", format: "uuid" },
      amount: money,
      fee: { type: "string", pattern: "^[0-9]+$" },
      currency: { const: "NGN" },
      status: {
        enum: [
          "created",
          "awaiting_authorization",
          "processing",
          "successful",
          "failed",
          "reversed",
          "cancelled",
        ],
      },
      reference: { type: "string" },
      details: { type: "object", additionalProperties: true },
    },
  },
};
