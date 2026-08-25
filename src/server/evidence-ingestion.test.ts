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
});
