import { describe, expect, it } from "vitest";
import { businessSetupTemplate, compileJourney, completeNode, healthInsuranceTemplate, movingHomeTemplate, newBabyTemplate, retirementTemplate, vehiclePurchaseTemplate } from "./journey-engine";
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
      progress: { completed: 1, total: 4, percent: 25 },
      nextAction: {
        nodeKey: "birth_certificate",
        status: "available",
        href: "/journeys/journey-aarav/services/birth_certificate",
      },
    });
  });

  it("does not replace the next required action with a supporting information node", () => {
    const afterRegistration = completeNode(compileJourney(newBabyTemplate), "birth_registration");
    const summary = buildJourneySummary({
      id: "journey-aarav",
      status: "active",
      subject: { id: "child-aarav", type: "child", displayName: "Aarav Sharma" },
      projection: {
        ...afterRegistration,
        nodes: afterRegistration.nodes.map((node) => node.key === "birth_entry_review" ? { ...node, status: "in_progress" as const } : node),
      },
      facts: {},
      serviceRuns: {},
      createdAt: "2026-08-25T10:00:00.000Z",
      updatedAt: "2026-08-25T10:05:00.000Z",
    });

    expect(summary.nextAction?.nodeKey).toBe("birth_certificate");
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

  it("summarises a personal health journey with its profile route", () => {
    const summary = buildJourneySummary({
      id: "journey-health",
      status: "active",
      subject: { id: "person-1", type: "person", displayName: "Ananya Sharma" },
      projection: compileJourney(healthInsuranceTemplate),
      facts: {},
      serviceRuns: {},
      createdAt: "2026-08-26T10:00:00.000Z",
      updatedAt: "2026-08-26T10:00:00.000Z",
    });

    expect(summary.title).toBe("Health & Insurance");
    expect(summary.nextAction?.href).toBe("/journeys/journey-health/health-profile");
  });

  it.each([
    [movingHomeTemplate, "residence" as const, "New home in Hyderabad", "/journeys/journey-new/move-profile"],
    [businessSetupTemplate, "business" as const, "Ananya Studio", "/journeys/journey-new/business-profile"],
    [retirementTemplate, "person" as const, "Ananya Sharma", "/journeys/journey-new/retirement-profile"],
  ])("routes a remaining journey to its real first step", (template, type, displayName, href) => {
    const summary = buildJourneySummary({
      id: "journey-new",
      status: "active",
      subject: { id: "subject-1", type, displayName },
      projection: compileJourney(template),
      facts: {},
      serviceRuns: {},
      createdAt: "2026-08-26T10:00:00.000Z",
      updatedAt: "2026-08-26T10:00:00.000Z",
    });

    expect(summary.title).toBe(template.title);
    expect(summary.nextAction?.href).toBe(href);
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
    expect(summary.progress.percent).toBe(38);
  });
});
