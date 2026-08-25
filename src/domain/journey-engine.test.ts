import { describe, expect, it } from "vitest";
import { compileJourney, completeNode, newBabyTemplate } from "./journey-engine";

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
});
