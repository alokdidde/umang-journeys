import { describe, expect, it } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { createSampleEvidence, ingestUploadedEvidence } from "./evidence-ingestion";

describe("vehicle evidence ingestion", () => {
  it("never fabricates journey facts for a user upload and leaves it for review", async () => {
    const fieldNames = [
      "registrationNumber", "makeModel", "chassisLast5", "registeredOwner", "sellerName", "buyerName", "saleDate", "city", "state", "childName", "dateOfBirth", "vaccine", "administeredOn", "provider", "batchNumber", "policyNumber", "insuredName", "insurer", "sumInsured", "validFrom", "validUntil", "dischargeReference", "residentName", "address", "documentType", "issuedOn", "businessName", "residenceOccupancy", "businessOccupancy", "memberName", "retirementAccountType", "accountReference", "retirementServiceYears", "statementDate",
    ];
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({ kind: "unknown", confidence: 0.18, fields: Object.fromEntries(fieldNames.map((name) => [name, null])) }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 30, noCache: 30, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 10, text: 10, reasoning: 0 },
        },
        warnings: [],
      },
    });
    const evidence = await ingestUploadedEvidence("vehicle_rc", {
      name: "registration-certificate.pdf",
      type: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF-1.4\nsynthetic upload")),
    }, {
      "vehicle.registrationNumber": "TS09EV4321",
      "vehicle.chassisLast5": "7K2P9",
    }, { model });

    expect(evidence.verificationStatus).toBe("needs_review");
    expect(evidence.extractedFields).toEqual({});
    expect(evidence.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Visible fields", status: "failed" }),
      expect.objectContaining({ label: "File safety", status: "passed" }),
    ]));
  });

  it("generates a real PDF and extracts journey-matching RC fields", async () => {
    const evidence = await createSampleEvidence("vehicle_rc", {
      "vehicle.registrationNumber": "TS09EV4321",
      "vehicle.makeModel": "Tata Nexon EV",
      "vehicle.chassisLast5": "7K2P9",
    });

    expect(Buffer.from(evidence.contentBase64, "base64").subarray(0, 4).toString()).toBe("%PDF");
    expect(evidence).toMatchObject({
      type: "vehicle_rc",
      mimeType: "application/pdf",
      source: "sample",
      verificationStatus: "verified",
      extractedFields: { registrationNumber: "TS09EV4321", chassisLast5: "7K2P9" },
    });
  });

  it("generates a vaccination receipt that can be matched to a child journey", async () => {
    const evidence = await createSampleEvidence("vaccination_receipt", {
      "child.name": "Aarav Sharma",
      "child.dateOfBirth": "2026-08-24",
    });

    expect(evidence).toMatchObject({
      type: "vaccination_receipt",
      source: "sample",
      extractedFields: {
        childName: "Aarav Sharma",
        vaccine: "BCG",
        administeredOn: "2026-08-24",
        provider: "Apollo Hospital",
      },
    });
  });

  it("generates a health policy with person and coverage fields", async () => {
    const evidence = await createSampleEvidence("health_insurance_policy", {
      "person.name": "Ananya Sharma",
      "person.dateOfBirth": "1992-04-18",
    });

    expect(evidence).toMatchObject({
      type: "health_insurance_policy",
      source: "sample",
      extractedFields: {
        insuredName: "Ananya Sharma",
        policyNumber: "HLT-SBX-502781",
        sumInsured: "INR 500000",
      },
    });
  });

  it.each([
    ["residence_proof" as const, { "move.newAddress": "12 Lake View Road, Hyderabad 500081" }, { address: "12 Lake View Road, Hyderabad 500081" }],
    ["business_premises_proof" as const, { "business.name": "Ananya Design Studio" }, { businessName: "Ananya Design Studio" }],
    ["retirement_account_statement" as const, { "person.name": "Ananya Sharma" }, { memberName: "Ananya Sharma" }],
  ])("generates useful sample evidence for another journey", async (type, facts, expectedFields) => {
    const evidence = await createSampleEvidence(type, facts);

    expect(Buffer.from(evidence.contentBase64, "base64").subarray(0, 4).toString()).toBe("%PDF");
    expect(evidence).toMatchObject({ type, source: "sample", extractedFields: expectedFields });
  });
});
