import { describe, expect, it } from "vitest";
import { buildCitizenHubSnapshot } from "./citizen-hub";

describe("citizen hub snapshot", () => {
  it("combines uploaded, issued, and journey activity without duplicating applied evidence", () => {
    const snapshot = buildCitizenHubSnapshot({
      journeys: [{
        id: "journey-child",
        subject: { type: "child", displayName: "Aarav Sharma" },
        title: "Having a Baby",
        createdAt: "2026-08-24T08:00:00.000Z",
        updatedAt: "2026-08-26T08:00:00.000Z",
        evidence: [{
          id: "evidence-vaccine",
          type: "vaccination_receipt",
          fileName: "sample-vaccination-receipt.pdf",
          mimeType: "application/pdf",
          size: 720,
          source: "sample",
          verificationStatus: "verified",
          extractedFields: {},
          createdAt: "2026-08-26T07:00:00.000Z",
        }],
        serviceRuns: {
          vaccination_timeline: {
            status: "completed",
            updatedAt: "2026-08-26T07:04:00.000Z",
            artifact: { title: "Vaccination timeline" },
            events: [{ stageKey: "publish_timeline", title: "Timeline published", detail: "Ready to review", occurredAt: "2026-08-26T07:04:00.000Z" }],
          },
        },
      }],
      documents: [{
        id: "document-vaccine",
        status: "applied",
        fileName: "sample-vaccination-receipt.pdf",
        mimeType: "application/pdf",
        size: 720,
        source: "sample",
        analysis: { kind: "vaccination_receipt", confidence: 0.98, fields: {} },
        proposal: { title: "Record BCG for Aarav Sharma" },
        appliedJourneyId: "journey-child",
        createdAt: "2026-08-26T07:00:00.000Z",
        updatedAt: "2026-08-26T07:01:00.000Z",
      }],
    });

    expect(snapshot.documents.filter((document) => document.origin === "uploaded")).toHaveLength(1);
    expect(snapshot.documents).toContainEqual(expect.objectContaining({ origin: "issued", title: "Vaccination timeline" }));
    expect(snapshot.activity[0]).toMatchObject({ title: "Timeline published", journeyId: "journey-child" });
    expect(snapshot.summary).toMatchObject({ uploaded: 1, issued: 1, activity: 5 });
  });

  it("surfaces evidence reviews, provider questions, and journey exceptions as tasks", () => {
    const snapshot = buildCitizenHubSnapshot({
      journeys: [{
        id: "journey-vehicle",
        subject: { type: "vehicle", displayName: "Tata Nexon" },
        title: "Buying a Vehicle",
        createdAt: "2026-08-26T08:00:00.000Z",
        updatedAt: "2026-08-26T08:00:00.000Z",
        facts: { "vehicle.transferScope": "interstate" },
        projection: { nodes: [{ key: "ownership_transfer", title: "Transfer ownership", status: "in_progress" }] },
        evidence: [{ id: "rc", type: "vehicle_rc", fileName: "rc.pdf", mimeType: "application/pdf", size: 500, source: "user_upload", verificationStatus: "needs_review", extractedFields: {}, createdAt: "2026-08-26T08:00:00.000Z" }],
        serviceRuns: { ownership_transfer: { status: "failed", updatedAt: "2026-08-26T08:01:00.000Z", events: [] } },
      }],
      documents: [],
    });

    expect(snapshot.tasks.map((task) => task.title)).toEqual(expect.arrayContaining([
      "Prepare the interstate transfer",
      "Review Vehicle Rc",
      "Respond to the provider",
    ]));
    expect(snapshot.summary.tasks).toBe(3);
  });
});
