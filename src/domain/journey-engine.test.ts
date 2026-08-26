import { describe, expect, it } from "vitest";
import { activateBranch, businessSetupTemplate, compileJourney, completeNode, healthInsuranceTemplate, hydrateJourney, isJourneyComplete, journeyTemplates, movingHomeTemplate, newBabyTemplate, retirementTemplate, validateTemplate, vehiclePurchaseTemplate, type JourneyTemplate } from "./journey-engine";

describe("journey compiler", () => {
  it("activates a conditional branch only when confirmed facts satisfy its gate", () => {
    const template: JourneyTemplate = {
      id: "conditional.test.v1",
      version: 1,
      lifeEvent: "buying_a_vehicle",
      title: "Conditional test",
      branches: [
        { key: "core", title: "Core", description: "Always present", requirement: "required" },
        {
          key: "interstate",
          title: "Interstate transfer",
          description: "Only when the vehicle crosses state borders",
          requirement: "conditional",
          gate: { all: [{ factKey: "vehicle.transferScope", operator: "equals", value: "interstate" }] },
        },
      ],
      nodes: [
        { key: "vehicle", title: "Vehicle", description: "Confirm vehicle", icon: "car", timing: "Now", branchKey: "core" },
        { key: "noc", title: "NOC", description: "Prepare NOC", icon: "file-key", timing: "Before transfer", branchKey: "interstate" },
      ],
    };

    const unresolved = compileJourney(template);
    expect(unresolved.branches.find((branch) => branch.key === "interstate")).toMatchObject({ active: false, applicability: "pending", status: "awaiting_context" });

    const inapplicable = compileJourney(template, { "vehicle.transferScope": "same_state" });
    expect(inapplicable.branches.find((branch) => branch.key === "interstate")).toMatchObject({ active: false, applicability: "not_applicable", status: "not_applicable" });

    const applicable = compileJourney(template, { "vehicle.transferScope": "interstate" });
    expect(applicable.branches.find((branch) => branch.key === "interstate")).toMatchObject({ active: true, applicability: "applicable", status: "available" });
    expect(applicable.nodes.find((node) => node.key === "noc")?.status).toBe("available");
  });

  it("keeps an explicitly uncertain fact pending instead of treating it as a negative answer", () => {
    const pending = compileJourney(vehiclePurchaseTemplate, { "vehicle.acquisitionRoute": "not_sure" });

    expect(pending.branches.find((branch) => branch.key === "new_vehicle")?.applicability).toBe("pending");
    expect(pending.branches.find((branch) => branch.key === "used_vehicle")?.applicability).toBe("pending");
  });

  it("keeps routing decisions, external decisions, and future milestones visible without making them fake completion work", () => {
    const template: JourneyTemplate = {
      id: "supporting.test.v1",
      version: 1,
      lifeEvent: "having_a_baby",
      title: "Supporting nodes",
      branches: [{ key: "core", title: "Core", description: "Core work", requirement: "required" }],
      nodes: [
        { key: "task", title: "Task", description: "A real action", icon: "clipboard-check", timing: "Now", branchKey: "core" },
        { key: "decision", title: "Authority decision", description: "Made outside UMANG", icon: "landmark", timing: "After submission", branchKey: "core", kind: "external_decision", action: "none", countsTowardCompletion: false, dependsOn: ["task"] },
        { key: "future", title: "Future milestone", description: "Not due yet", icon: "calendar-clock", timing: "Later", branchKey: "core", kind: "milestone", action: "official_resource", countsTowardCompletion: false, dependsOn: ["task"] },
      ],
    };

    const started = compileJourney(template);
    expect(started.nodes).toHaveLength(3);
    expect(started.nodes.find((node) => node.key === "decision")).toMatchObject({ actionable: false, contributesToCompletion: false });
    expect(started.nodes.find((node) => node.key === "future")).toMatchObject({ actionable: true, contributesToCompletion: false });

    const completed = hydrateJourney(template, [{ key: "task", status: "completed" }]);
    expect(isJourneyComplete(completed)).toBe(true);
    expect(completed.nodes.find((node) => node.key === "future")?.status).toBe("available");
  });

  it("keeps an in-progress journey pinned to the template version it started with", () => {
    const historicalTemplate: JourneyTemplate = {
      ...newBabyTemplate,
      version: 2,
      branches: [newBabyTemplate.branches[0]!],
      nodes: [newBabyTemplate.nodes[0]!, newBabyTemplate.nodes[3]!],
      edges: [],
    };

    const started = compileJourney(historicalTemplate);
    const completed = completeNode(started, "birth_registration");

    expect(completed.templateVersion).toBe(2);
    expect(completed.nodes.map((node) => node.key)).toEqual(["birth_registration", "birth_certificate"]);
  });

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

    expect(journey.nodes.length).toBeGreaterThanOrEqual(12);
    expect(journey.nodes.filter((node) => node.recommended).map((node) => node.key)).toEqual([
      "birth_registration",
    ]);
    expect(journey.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("locked");
  });

  it("unlocks parallel civil-record and child-health work after registration completes", () => {
    const journey = completeNode(compileJourney(newBabyTemplate), "birth_registration");

    expect(journey.nodes.find((node) => node.key === "birth_registration")?.status).toBe("completed");
    expect(journey.nodes.find((node) => node.key === "birth_certificate")?.status).toBe("available");
    expect(journey.nodes.find((node) => node.key === "child_health_record")?.status).toBe("available");
    expect(journey.nodes.find((node) => node.recommended)?.key).toBe("birth_certificate");
  });

  it("recommends the first unfinished service after the certificate completes", () => {
    const registered = completeNode(compileJourney(newBabyTemplate), "birth_registration");
    const certified = completeNode(registered, "birth_certificate");

    expect(certified.nodes.find((node) => node.recommended)?.key).toBe("child_health_record");
    expect(certified.nodes.find((node) => node.key === "vaccination_timeline")?.status).toBe("locked");
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
    expect(vehicleConfirmed.nodes.map((node) => node.key)).toEqual(expect.arrayContaining(["vehicle_details", "ownership_transfer", "insurance_cover", "fastag_setup", "compliance_calendar", "normal_sale_forms", "interstate_noc"]));
    expect(vehicleConfirmed.nodes.find((node) => node.key === "ownership_transfer")?.status).toBe("available");
  });

  it("separates required health-cover work from optional public and digital branches", () => {
    const started = compileJourney(healthInsuranceTemplate);
    const profileConfirmed = completeNode(started, "health_profile");

    expect(started.nodes.map((node) => node.key)).toEqual(expect.arrayContaining(["health_profile", "coverage_review", "public_scheme_check", "abha_records", "cashless_readiness", "pmjay_verification", "care_authorization"]));
    expect(profileConfirmed.nodes.find((node) => node.key === "coverage_review")?.status).toBe("available");
    expect(profileConfirmed.nodes.find((node) => node.key === "public_scheme_check")?.status).toBe("locked");
    expect(activateBranch(profileConfirmed, "public_cover").nodes.find((node) => node.key === "public_scheme_check")?.status).toBe("available");
  });

  it.each([
    [movingHomeTemplate, ["move_profile", "residence_evidence", "move_completion_pack"]],
    [businessSetupTemplate, ["business_profile", "business_premises", "business_launch_pack"]],
    [retirementTemplate, ["retirement_profile", "retirement_record_review", "pension_pathway"]],
  ])("keeps every remaining life-event journey resumable", (template, keys) => {
    const started = compileJourney(template);
    const profileConfirmed = completeNode(started, keys[0]);

    expect(started.nodes.map((node) => node.key)).toEqual(expect.arrayContaining(keys));
    expect(profileConfirmed.nodes.find((node) => node.key === keys[1])?.status).toBe("available");
    expect(profileConfirmed.nodes.find((node) => node.key === keys[2])?.status).toBe("locked");
  });

  it("validates every current journey graph", () => {
    expect(journeyTemplates.flatMap(validateTemplate)).toEqual([]);
  });

  it("ships every life event as a rich, sourced graph with a distinct SVG symbol for every node", () => {
    for (const template of journeyTemplates) {
      expect(template.version).toBeGreaterThanOrEqual(3);
      expect(template.nodes.length).toBeGreaterThanOrEqual(12);
      expect(template.branches.some((branch) => branch.requirement === "conditional")).toBe(true);
      expect(template.nodes.every((node) => node.source?.href.startsWith("https://"))).toBe(true);
      expect(new Set(template.nodes.map((node) => node.icon)).size).toBe(template.nodes.length);
      expect(template.nodes.some((node) => node.kind === "milestone" || node.kind === "recurring")).toBe(true);
      expect((template.edges ?? []).some((edge) => edge.type !== "hard")).toBe(true);
    }
  });

  it.each([
    [newBabyTemplate, { "birth.route": "hospital", "child.followupNeeded": "no" }],
    [vehiclePurchaseTemplate, { "vehicle.acquisitionRoute": "sale", "vehicle.transferScope": "same_state", "vehicle.hypothecation": "no" }],
    [healthInsuranceTemplate, { "health.currentCover": "no", "health.activeClaim": "no", "health.senior70Plus": "no" }],
    [movingHomeTemplate, { "move.hasRationCard": "no", "move.hasVehicle": "no", "move.occupancy": "rented", "move.utilityAppointment": "no" }],
    [businessSetupTemplate, { "business.structure": "sole_proprietorship", "business.hasPremises": "yes", "business.activityType": "services", "business.importExport": "no", "business.employeeCount": "0" }],
    [retirementTemplate, { "retirement.accountType": "epfo", "retirement.employmentSector": "private", "retirement.lowIncomeSupport": "no" }],
  ])("can resolve every conditional route from facts collected by its profile workflow", (template, facts) => {
    const projection = compileJourney(template, facts);

    expect(projection.branches.filter((branch) => branch.requirement === "conditional" && branch.applicability === "pending")).toEqual([]);
  });

  it("rejects a journey template whose dependencies contain a cycle", () => {
    const cyclic = {
      ...newBabyTemplate,
      nodes: newBabyTemplate.nodes.map((node) => node.key === "birth_registration" ? { ...node, dependsOn: ["birth_certificate"] } : node),
    };

    expect(validateTemplate(cyclic)).toContain("birth_registration:cycle");
  });
});
