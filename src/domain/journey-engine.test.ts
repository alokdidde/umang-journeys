import { describe, expect, it } from "vitest";
import { activateBranch, businessSetupTemplate, compileJourney, completeNode, healthInsuranceTemplate, isJourneyComplete, journeyTemplates, movingHomeTemplate, newBabyTemplate, retirementTemplate, validateTemplate, vehiclePurchaseTemplate } from "./journey-engine";

describe("journey compiler", () => {
  it("keeps optional branches dormant until the citizen adds one", () => {
    const started = compileJourney(newBabyTemplate);
    const identityBranch = started.branches.find((branch) => branch.key === "child_identity");

    expect(identityBranch).toMatchObject({ requirement: "optional", active: false, status: "inactive" });
    expect(started.nodes.find((node) => node.key === "child_identity")?.status).toBe("locked");

    const activated = activateBranch(started, "child_identity");
    expect(activated.branches.find((branch) => branch.key === "child_identity")).toMatchObject({ active: true, status: "locked" });
  });

  it("compiles the newborn template into one recommended node and locked dependants", () => {
    const journey = compileJourney(newBabyTemplate);

    expect(journey.nodes).toHaveLength(6);
    expect(journey.nodes.filter((node) => node.recommended).map((node) => node.key)).toEqual([
      "birth_registration",
    ]);
    expect(journey.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("locked");
  });

  it("unlocks only the certificate after registration completes", () => {
    const journey = completeNode(compileJourney(newBabyTemplate), "birth_registration");

    expect(journey.nodes.find((node) => node.key === "birth_registration")?.status).toBe("completed");
    expect(journey.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("available");
    expect(journey.nodes.filter((node) => node.status === "available")).toHaveLength(1);
  });

  it("recommends the first unfinished service after the certificate completes", () => {
    const registered = completeNode(compileJourney(newBabyTemplate), "birth_registration");
    const certified = completeNode(registered, "birth_certificate");

    expect(certified.nodes.find((node) => node.recommended)?.key).toBe("child_health_record");
    expect(certified.nodes.find((node) => node.key === "vaccination_timeline")?.status).toBe("available");
    expect(certified.nodes.find((node) => node.key === "child_identity")?.status).toBe("locked");
  });

  it("requires every step inside an activated optional branch before completion", () => {
    let journey = activateBranch(compileJourney(businessSetupTemplate), "formal_registrations");
    for (const key of ["business_profile", "business_premises", "business_launch_pack", "udyam_readiness"] as const) journey = completeNode(journey, key);

    expect(isJourneyComplete(journey)).toBe(false);
    expect(journey.nodes.find((node) => node.key === "gst_readiness")?.status).toBe("available");

    journey = completeNode(journey, "gst_readiness");
    expect(isJourneyComplete(journey)).toBe(true);
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

  it("separates required health-cover work from optional public and digital branches", () => {
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
    expect(activateBranch(profileConfirmed, "public_cover").nodes.find((node) => node.key === "public_scheme_check")?.status).toBe("available");
  });

  it.each([
    [movingHomeTemplate, ["move_profile", "residence_evidence", "aadhaar_address", "voter_address", "move_completion_pack"]],
    [businessSetupTemplate, ["business_profile", "business_premises", "udyam_readiness", "gst_readiness", "business_launch_pack"]],
    [retirementTemplate, ["retirement_profile", "retirement_record_review", "pension_pathway", "life_certificate_readiness", "retirement_pack"]],
  ])("keeps every remaining life-event journey resumable", (template, keys) => {
    const started = compileJourney(template);
    const profileConfirmed = completeNode(started, keys[0]);

    expect(started.nodes.map((node) => node.key)).toEqual(keys);
    expect(profileConfirmed.nodes.find((node) => node.key === keys[1])?.status).toBe("available");
    expect(profileConfirmed.nodes.find((node) => node.key === keys[2])?.status).toBe("locked");
  });

  it("validates every current journey graph", () => {
    expect(journeyTemplates.flatMap(validateTemplate)).toEqual([]);
  });

  it("rejects a journey template whose dependencies contain a cycle", () => {
    const cyclic = {
      ...newBabyTemplate,
      nodes: newBabyTemplate.nodes.map((node) => node.key === "birth_registration" ? { ...node, dependsOn: ["birth_certificate"] } : node),
    };

    expect(validateTemplate(cyclic)).toContain("birth_registration:cycle");
  });
});
