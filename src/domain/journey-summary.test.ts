import { describe, expect, it } from "vitest";
import { compileJourney, completeNode, newBabyTemplate, vehiclePurchaseTemplate } from "./journey-engine";
import { buildJourneySummary } from "./journey-summary";

describe("journey summary", () => {
  it("turns a completed registration into the next useful home action", () => {
    const summary = buildJourneySummary({
      id: "journey-aarav",
      status: "active",
      subject: { id: "child-aarav", type: "child", displayName: "Aarav Sharma" },
      projection: completeNode(compileJourney(newBabyTemplate), "birth_registration"),
      facts: {},
      serviceRuns: {},
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T10:05:00.000Z",
    });

    expect(summary).toMatchObject({
      id: "journey-aarav",
      subject: { displayName: "Aarav Sharma" },
      progress: { completed: 1, total: 6, percent: 17 },
      nextAction: {
        nodeKey: "birth_certificate",
        status: "available",
        href: "/journeys/journey-aarav/services/birth_certificate",
      },
    });
  });

  it("summarises a vehicle journey with the vehicle title and details route", () => {
    const summary = buildJourneySummary({
      id: "journey-vehicle",
      status: "active",
      subject: { id: "vehicle-1", type: "vehicle", displayName: "Tata Nexon" },
      projection: compileJourney(vehiclePurchaseTemplate),
      facts: {},
      serviceRuns: {},
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T10:00:00.000Z",
    });

    expect(summary.title).toBe("Buying a Vehicle");
    expect(summary.nextAction?.href).toBe("/journeys/journey-vehicle/vehicle-details");
  });

  it("prioritises resumable provider work and includes its partial progress", () => {
    const afterRegistration = completeNode(compileJourney(newBabyTemplate), "birth_registration");
    const summary = buildJourneySummary({
      id: "journey-aarav",
      status: "active",
      subject: { id: "child-aarav", type: "child", displayName: "Aarav Sharma" },
      projection: {
        ...afterRegistration,
        nodes: afterRegistration.nodes.map((node) =>
          node.key === "vaccination_timeline" ? { ...node, status: "waiting_external" as const } : node,
        ),
      },
      facts: { "child.dateOfBirth": "2026-08-24" },
      serviceRuns: {
        vaccination_timeline: {
          runId: "run-vaccine",
          nodeKey: "vaccination_timeline",
          provider: "U-WIN sandbox",
          status: "waiting_external",
          progress: 52,
          currentStage: 2,
          startedAt: "2026-08-25T10:00:00.000Z",
          updatedAt: "2026-08-25T10:04:00.000Z",
          receipt: "SBX-123",
          events: [],
        },
      },
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T10:05:00.000Z",
    });

    expect(summary.nextAction).toMatchObject({
      nodeKey: "vaccination_timeline",
      stateLabel: "Waiting for provider",
      progress: 52,
      timingLabel: "6-week milestone · 5 Oct 2026",
    });
    expect(summary.progress.percent).toBe(25);
  });
});
