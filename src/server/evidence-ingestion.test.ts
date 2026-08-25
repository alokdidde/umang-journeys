import { describe, expect, it } from "vitest";
import { createSampleEvidence } from "./evidence-ingestion";

describe("vehicle evidence ingestion", () => {
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
});
