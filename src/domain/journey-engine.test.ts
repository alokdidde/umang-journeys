import { describe, expect, it } from "vitest";
import { businessSetupTemplate, compileJourney, completeNode, healthInsuranceTemplate, movingHomeTemplate, newBabyTemplate, retirementTemplate, vehiclePurchaseTemplate } from "./journey-engine";

describe("journey compiler", () => {
  it("compiles the newborn template into one recommended node and locked dependants", () => {
    const journey = compileJourney(newBabyTemplate);

    expect(journey.nodes).toHaveLength(6);
    expect(journey.nodes.filter((node) => node.recommended).map((node) => node.key)).toEqual([
      "birth_registration",
    ]);
    expect(journey.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("locked");
  });

  it("unlocks the certificate and downstream previews after registration completes", () => {
    const journey = completeNode(compileJourney(newBabyTemplate), "birth_registration");

    expect(journey.nodes.find((node) => node.key === "birth_registration")?.status).toBe("completed");
    expect(journey.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("available");
    expect(journey.nodes.filter((node) => node.status === "available")).toHaveLength(5);
  });

  it("recommends the first unfinished service after the certificate completes", () => {
    const registered = completeNode(compileJourney(newBabyTemplate), "birth_registration");
    const certified = completeNode(registered, "birth_certificate");

    expect(certified.nodes.find((node) => node.recommended)?.key).toBe("child_health_record");
  });

  it("keeps a vehicle journey on its own template as steps complete", () => {
    const started = compileJourney(vehiclePurchaseTemplate);
    const vehicleConfirmed = completeNode(started, "vehicle_details");

    expect(vehicleConfirmed.templateId).toBe(vehiclePurchaseTemplate.id);
    expect(vehicleConfirmed.nodes.map((node) => node.key)).toEqual([
      "vehicle_details",
      "ownership_transfer",
      "insurance_cover",
      "fastag_setup",
      "compliance_calendar",
    ]);
    expect(vehicleConfirmed.nodes.find((node) => node.key === "ownership_transfer")?.status).toBe("available");
  });

  it("keeps health-cover steps in one clear sequence", () => {
    const started = compileJourney(healthInsuranceTemplate);
    const profileConfirmed = completeNode(started, "health_profile");

    expect(started.nodes.map((node) => node.key)).toEqual([
      "health_profile",
      "coverage_review",
      "public_scheme_check",
      "abha_records",
      "cashless_readiness",
    ]);
    expect(profileConfirmed.nodes.find((node) => node.key === "coverage_review")?.status).toBe("available");
    expect(profileConfirmed.nodes.find((node) => node.key === "public_scheme_check")?.status).toBe("locked");
  });

  it.each([
    [movingHomeTemplate, ["move_profile", "residence_evidence", "aadhaar_address", "voter_address", "move_completion_pack"]],
    [businessSetupTemplate, ["business_profile", "business_premises", "udyam_readiness", "gst_readiness", "business_launch_pack"]],
    [retirementTemplate, ["retirement_profile", "retirement_record_review", "pension_pathway", "life_certificate_readiness", "retirement_pack"]],
  ])("keeps every remaining life-event journey sequential and resumable", (template, keys) => {
    const started = compileJourney(template);
    const profileConfirmed = completeNode(started, keys[0]);

    expect(started.nodes.map((node) => node.key)).toEqual(keys);
    expect(profileConfirmed.nodes.find((node) => node.key === keys[1])?.status).toBe("available");
    expect(profileConfirmed.nodes.find((node) => node.key === keys[2])?.status).toBe("locked");
  });
});
