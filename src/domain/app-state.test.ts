import { describe, expect, it } from "vitest";
import { appReducer, pristineState } from "./app-state";

describe("demo journey state", () => {
  it("blocks registration when the two required fields are missing", () => {
    const state = appReducer(pristineState, { type: "submit_registration" });
    expect(state.formErrors).toEqual({ childName: "Enter the child's name", localWard: "Select a ward or area" });
    expect(state.registrationId).toBeNull();
  });

  it("completes registration once the two fields are present", () => {
    const withName = appReducer(pristineState, { type: "set_field", field: "childName", value: "Aarav Sharma" });
    const complete = appReducer(withName, { type: "set_field", field: "localWard", value: "Ward 72 — Serilingampally" });
    const submitted = appReducer(complete, { type: "submit_registration" });

    expect(submitted.registrationId).toBe("BR-DEMO-2026-7429");
    expect(submitted.projection.nodes.find((node) => node.key === "birth_registration")?.status).toBe("completed");
  });
});
