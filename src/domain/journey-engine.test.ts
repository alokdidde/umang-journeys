import { describe, expect, it } from "vitest";
import { compileJourney, completeNode, newBabyTemplate, vehiclePurchaseTemplate } from "./journey-engine";

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
});
