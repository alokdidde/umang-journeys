"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, GitBranch, LockKeyhole, Plus, Route, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { journeyIcons } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import { journeyProgressNodes, type JourneyNode, type JourneyProjection } from "@/domain/journey-engine";
import { journeyNodeHref } from "@/domain/journey-summary";

type PositionedNode = { node: JourneyNode; x: number; y: number };
type GraphLayout = { width: number; height: number; nodes: PositionedNode[] };

function graphLayout(projection: JourneyProjection): GraphLayout {
  const depth = new Map(projection.nodes.map((node) => [node.key, 0]));
  for (let pass = 0; pass < projection.nodes.length; pass += 1) {
    for (const node of projection.nodes) {
      const dependencyDepths = (node.dependsOn ?? []).map((key) => depth.get(key) ?? 0);
      depth.set(node.key, dependencyDepths.length ? Math.max(...dependencyDepths) + 1 : 0);
    }
  }
  const layerCount = Math.max(...depth.values(), 0) + 1;
  const layers = Array.from({ length: layerCount }, () => [] as JourneyNode[]);
  for (const node of projection.nodes) layers[depth.get(node.key) ?? 0]!.push(node);
  const cardWidth = 228;
  const cardHeight = 170;
  const columnGap = 76;
  const layerColumnGap = 16;
  const rowGap = 18;
  const padding = 28;
  const rowsByLayer = layers.map((layer) => Math.ceil(layer.length / (layer.length > 2 ? 2 : 1)));
  const maxRows = Math.max(...rowsByLayer, 1);
  const height = Math.max(420, maxRows * cardHeight + (maxRows - 1) * rowGap + padding * 2);
  const layerWidths = layers.map((layer) => (layer.length > 2 ? 2 : 1) * cardWidth + (layer.length > 2 ? layerColumnGap : 0));
  const width = layerWidths.reduce((total, value) => total + value, 0) + (layerCount - 1) * columnGap + padding * 2;
  let layerX = padding;
  const nodes = layers.flatMap((layer, layerIndex) => {
    const columns = layer.length > 2 ? 2 : 1;
    const rows = rowsByLayer[layerIndex]!;
    const layerHeight = rows * cardHeight + Math.max(0, rows - 1) * rowGap;
    const startY = (height - layerHeight) / 2;
    const positioned = layer.map((node, index) => {
      const column = columns === 1 ? 0 : Math.floor(index / rows);
      const row = columns === 1 ? index : index % rows;
      return { node, x: layerX + column * (cardWidth + layerColumnGap), y: startY + row * (cardHeight + rowGap) };
    });
    layerX += layerWidths[layerIndex]! + columnGap;
    return positioned;
  });
  return { width, height, nodes };
}

function statusLabel(node: JourneyNode, active: boolean) {
  if (!active) return "Optional";
  if (node.status === "completed") return "Done";
  if (node.status === "waiting_external") return "Waiting";
  if (node.status === "in_progress") return "In progress";
  if (node.status === "blocked") return "Needs attention";
  if (node.status === "available") return "Ready";
  return "Later";
}

function JourneyMapCard({ id, node, projection }: { id: string; node: JourneyNode; projection: JourneyProjection }) {
  const { state, activateBranch } = useJourney();
  const branch = projection.branches.find((candidate) => candidate.key === node.branchKey)!;
  const Icon = journeyIcons[node.icon];
  const branchNodes = projection.nodes.filter((candidate) => candidate.branchKey === branch.key);
  const entryNode = branchNodes.find((candidate) => (candidate.dependsOn ?? []).every((dependency) => !branchNodes.some((member) => member.key === dependency)));
  const canOpen = branch.active && node.status !== "locked";
  return <article className={`journey-map-node ${node.status} ${branch.active ? "branch-active" : "branch-inactive"}`}>
    <header>
      <span className="journey-map-node-icon"><Icon /></span>
      <div><small>{branch.title} branch</small><h3>{node.title}</h3></div>
      <span className={`journey-map-state ${node.status}`}>{node.status === "completed" ? <CheckCircle2 /> : node.status === "locked" ? <LockKeyhole /> : null}{statusLabel(node, branch.active)}</span>
    </header>
    <p>{node.description}</p>
    <footer>
      <span className={`journey-branch-kind ${branch.requirement}`}>{branch.requirement === "required" ? "Required" : branch.active ? "Added" : "Optional"}</span>
      {!branch.active && entryNode?.key === node.key
        ? <button type="button" disabled={state.pending} onClick={() => void activateBranch(id, branch.key)} aria-label={`Add ${branch.title}`}><Plus />{state.pending ? "Adding…" : "Add branch"}</button>
        : canOpen
          ? <DialogPrimitive.Close asChild><Link href={journeyNodeHref(id, node.key)}>Open<ArrowRight /></Link></DialogPrimitive.Close>
          : null}
    </footer>
  </article>;
}

function JourneyGraph({ id, projection }: { id: string; projection: JourneyProjection }) {
  const layout = graphLayout(projection);
  const positions = new Map(layout.nodes.map((item) => [item.node.key, item]));
  const titleByKey = new Map(projection.nodes.map((node) => [node.key, node.title]));
  return <section className="journey-map-viewport" aria-label="Journey dependency map">
    <div className="journey-map-canvas" style={{ width: layout.width, height: layout.height }}>
      <svg aria-hidden="true" className="journey-map-edges" viewBox={`0 0 ${layout.width} ${layout.height}`}>
        <defs><marker id="journey-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
        {projection.edges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const startX = from.x + 228;
          const startY = from.y + 85;
          const endX = to.x;
          const endY = to.y + 85;
          const bend = Math.max(28, (endX - startX) / 2);
          return <path key={`${edge.from}-${edge.to}`} d={`M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX - 8} ${endY}`} markerEnd="url(#journey-arrow)" />;
        })}
      </svg>
      {layout.nodes.map(({ node, x, y }) => <div className="journey-map-node-position" style={{ transform: `translate(${x}px, ${y}px)` }} key={node.key}><JourneyMapCard id={id} node={node} projection={projection} /></div>)}
    </div>
    <ol className="journey-map-mobile-list">
      {projection.nodes.map((node) => <li key={node.key}>
        {(node.dependsOn ?? []).length ? <p>After {(node.dependsOn ?? []).map((key) => titleByKey.get(key) ?? key).join(" and ")}</p> : <p>Start here</p>}
        <JourneyMapCard id={id} node={node} projection={projection} />
      </li>)}
    </ol>
  </section>;
}

export function JourneyMapDrawer({ id, title }: { id: string; title: string }) {
  const { state } = useJourney();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("view") === "map";
  const progressNodes = journeyProgressNodes(state.projection);
  const completed = progressNodes.filter((node) => node.status === "completed" || node.status === "skipped").length;
  const inactiveOptionalCount = state.projection.branches.filter((branch) => branch.requirement === "optional" && !branch.active).length;

  function setOpen(nextOpen: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextOpen) params.set("view", "map"); else params.delete("view");
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  return <div className="journey-map-launch content-layer">
    <button type="button" className="secondary-button" onClick={() => setOpen(true)}><Route />View journey map</button>
    <p><strong>{completed} of {progressNodes.length} required or added steps done</strong><span>{inactiveOptionalCount > 0 ? `${inactiveOptionalCount} optional ${inactiveOptionalCount === 1 ? "branch" : "branches"} available` : "All optional branches added"}</span></p>
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="journey-map-overlay" />
        <DialogPrimitive.Content className="journey-map-drawer" aria-describedby="journey-map-description">
          <header className="journey-map-header">
            <div><p><GitBranch />{title}</p><DialogPrimitive.Title className="journey-map-title">Your full journey</DialogPrimitive.Title><DialogPrimitive.Description className="journey-map-description" id="journey-map-description">Required branches must be finished. Optional branches count only after you add them.</DialogPrimitive.Description></div>
            <DialogPrimitive.Close className="journey-map-close" aria-label="Close journey map"><X /></DialogPrimitive.Close>
          </header>
          <div className="journey-map-legend" aria-label="Journey map legend"><span><i className="required" />Required branch</span><span><i className="optional" />Optional branch</span><span><i className="complete" />Completed step</span></div>
          {state.error ? <p className="journey-map-error" role="status">{state.error}</p> : null}
          <JourneyGraph id={id} projection={state.projection} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  </div>;
}
