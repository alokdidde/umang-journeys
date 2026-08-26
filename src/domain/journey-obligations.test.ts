import { describe, expect, it } from "vitest";
import { activateBranch, compileJourney, newBabyTemplate, vehiclePurchaseTemplate, healthInsuranceTemplate } from "./journey-engine";
import { deriveJourneyObligations } from "./journey-obligations";

describe("journey obligations", () => {
  it("derives child milestones from the confirmed birth date", () => {
    const facts = { "child.dateOfBirth": "2026-08-24", "child.followupNeeded": "yes", "journey.branch.child_identity.active": "true" };
    const projection = activateBranch(compileJourney(newBabyTemplate, facts), "child_identity", facts);
    const obligations = deriveJourneyObligations({ projection, facts, now: new Date("2026-08-25T00:00:00.000Z") });

    expect(obligations).toEqual(expect.arrayContaining([
      expect.objectContaining({ nodeKey: "hbnc_visits", dueOn: "2026-10-05", status: "upcoming" }),
      expect.objectContaining({ nodeKey: "biometric_update_5", dueOn: "2031-08-24", status: "upcoming" }),
    ]));
  });

  it("uses verified record dates and identifies overdue vehicle duties", () => {
    const projection = compileJourney(vehiclePurchaseTemplate, {});
    const obligations = deriveJourneyObligations({ projection, facts: { "vehicle.pucValidUntil": "2026-08-20" }, now: new Date("2026-08-26T00:00:00.000Z") });

    expect(obligations.find((item) => item.nodeKey === "puc_milestone")).toMatchObject({ dueOn: "2026-08-20", status: "overdue" });
  });

  it("keeps a recurring duty unscheduled when no supporting date exists", () => {
    const projection = compileJourney(healthInsuranceTemplate, {});
    const obligation = deriveJourneyObligations({ projection, facts: {}, now: new Date("2026-08-26T00:00:00.000Z") }).find((item) => item.nodeKey === "policy_renewal");

    expect(obligation).toMatchObject({ dueOn: null, status: "unscheduled", basis: "Waiting for the policy end date" });
  });

  it("marks a dated obligation complete only from an explicit completion fact", () => {
    const projection = compileJourney(vehiclePurchaseTemplate, {});
    const obligation = deriveJourneyObligations({ projection, facts: { "vehicle.pucValidUntil": "2026-08-20", "obligation.puc_milestone.completedOn": "2026-08-19" }, now: new Date("2026-08-26T00:00:00.000Z") }).find((item) => item.nodeKey === "puc_milestone");

    expect(obligation).toMatchObject({ status: "completed", completedOn: "2026-08-19" });
  });
});
