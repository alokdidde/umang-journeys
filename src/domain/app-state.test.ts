import { describe, expect, it } from "vitest";
import { appReducer, pristineState } from "./app-state";

describe("demo journey state", () => {
  it("hydrates the active journey from the server projection", () => {
    const serverProjection = {
      ...pristineState.projection,
      nodes: pristineState.projection.nodes.map((node) =>
        node.key === "birth_registration" ? { ...node, status: "completed" as const } : node,
      ),
    };
    const state = appReducer(pristineState, {
      type: "server_journey_loaded",
      journey: {
        id: "journey-123",
        subject: { id: "child-aarav", type: "child", displayName: "Aarav Sharma", canonicalEntityId: "entity-aarav" },
        projection: serverProjection,
        facts: { "child.name": "Aarav Sharma", "birth.place.ward": "Ward 72 — Serilingampally" },
        registrationId: "BR-2026-1234",
      },
    });

    expect(state.journeyId).toBe("journey-123");
    expect(state.subject).toMatchObject({ displayName: "Aarav Sharma", canonicalEntityId: "entity-aarav" });
    expect(state.form).toEqual({ childName: "Aarav Sharma", localWard: "Ward 72 — Serilingampally" });
    expect(state.registrationId).toBe("BR-2026-1234");
    expect(state.projection.nodes[0]?.status).toBe("completed");
  });

  it("blocks registration when the two required fields are missing", () => {
    const state = appReducer(pristineState, { type: "submit_registration" });
    expect(state.formErrors).toEqual({ childName: "Enter the child's name", localWard: "Select a ward or area" });
    expect(state.registrationId).toBeNull();
  });

  it("waits for server confirmation after validating the two fields", () => {
    const withName = appReducer(pristineState, { type: "set_field", field: "childName", value: "Aarav Sharma" });
    const complete = appReducer(withName, { type: "set_field", field: "localWard", value: "Ward 72 — Serilingampally" });
    const submitted = appReducer(complete, { type: "submit_registration" });

    expect(submitted.registrationId).toBeNull();
    expect(submitted.projection.nodes.find((node) => node.key === "birth_registration")?.status).toBe("in_progress");
    expect(submitted.formErrors).toEqual({});
  });

  it("exposes recoverable server failures without discarding answers", () => {
    const withName = appReducer(pristineState, { type: "set_field", field: "childName", value: "Aarav Sharma" });
    const failed = appReducer(withName, { type: "operation_failed", message: "Registry sandbox is temporarily unavailable." });

    expect(failed.error).toBe("Registry sandbox is temporarily unavailable.");
    expect(failed.pending).toBe(false);
    expect(failed.form.childName).toBe("Aarav Sharma");
  });

  it("clears an earlier clarification when the citizen starts a different statement", () => {
    const answered = appReducer(pristineState, { type: "set_health_coverage_known", value: "yes" });
    const changed = appReducer(answered, { type: "set_statement", value: "I bought a vehicle" });

    expect(changed.healthCoverageKnown).toBeNull();
    expect(changed.vehicleOwnershipTransferred).toBeNull();
    expect(changed.hospitalRegistered).toBeNull();
  });

  it("hydrates persisted external-service progress for refresh recovery", () => {
    const state = appReducer(pristineState, {
      type: "server_journey_loaded",
      journey: {
        id: "journey-progress",
        subject: { id: "child-aarav", type: "child", displayName: "Aarav Sharma" },
        projection: pristineState.projection,
        facts: {},
        serviceRuns: {
          vaccination_timeline: {
            runId: "RUN-123",
            nodeKey: "vaccination_timeline",
            provider: "U-WIN immunisation sandbox",
            status: "waiting_external",
            progress: 52,
            currentStage: 2,
            startedAt: "2026-08-25T10:00:00.000Z",
            updatedAt: "2026-08-25T10:00:01.000Z",
            receipt: "SBX-123",
            events: [],
          },
        },
      },
    });

    expect(state.serviceRuns.vaccination_timeline).toMatchObject({ status: "waiting_external", progress: 52 });
  });
});
