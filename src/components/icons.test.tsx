import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JourneyNodeIcon } from "@/components/icons";
import { journeyTemplates } from "@/domain/journey-engine";

describe("journey node visuals", () => {
  it("renders a distinct inline SVG for every service node", async () => {
    for (const template of journeyTemplates) {
      const rendered = new Map<string, string>();
      for (const node of template.nodes) {
        const view = render(<JourneyNodeIcon name={node.icon} />);
        await waitFor(() => expect(view.container.querySelector("svg")).not.toBeNull());
        const svg = view.container.querySelector("svg")!;
        const signature = svg.innerHTML;
        expect(signature, `${template.id}:${node.key} should have an SVG`).not.toBe("");
        expect(rendered.has(signature), `${template.id}:${node.key} should not reuse another node's SVG`).toBe(false);
        rendered.set(signature, node.key);
        view.unmount();
      }
    }
  });
});
