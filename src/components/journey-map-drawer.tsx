"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink, GitBranch, LockKeyhole, Plus, Route, Search, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { JourneyNodeIcon } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";
import { journeyProgressNodes, type JourneyBranch, type JourneyEdgeDefinition, type JourneyNode, type JourneyProjection } from "@/domain/journey-engine";
import { journeyNodeHref } from "@/domain/journey-summary";

const CARD_WIDTH = 224;
const CARD_HEIGHT = 164;
const LANE_LABEL_WIDTH = 190;
const COLUMN_GAP = 72;
const ROW_GAP = 14;
const LANE_GAP = 14;
const PADDING = 20;

type PositionedNode = { node: JourneyNode; x: number; y: number };
type PositionedLane = { branch: JourneyBranch; x: number; y: number; width: number; height: number };
type GraphLayout = { width: number; height: number; nodes: PositionedNode[]; lanes: PositionedLane[] };

export function filterJourneyProjection(projection: JourneyProjection, filters: { scope: "relevant" | "all"; query: string }): JourneyProjection {
  const query = filters.query.trim().toLocaleLowerCase("en-IN");
  const branchMatches = new Set(projection.branches.filter((branch) => `${branch.title} ${branch.description}`.toLocaleLowerCase("en-IN").includes(query)).map((branch) => branch.key));
  const relevantBranch = (branch: JourneyBranch) => branch.active || (branch.requirement === "conditional" && branch.applicability === "pending") || branch.requirement === "required";
  const nodes = projection.nodes.filter((node) => {
    const branch = projection.branches.find((candidate) => candidate.key === node.branchKey);
    if (!branch) return false;
    if (filters.scope === "relevant" && (!relevantBranch(branch) || node.applicability === "not_applicable" || node.status === "skipped")) return false;
    if (!query) return true;
    const haystack = `${node.title} ${node.description} ${node.timing} ${node.source?.authority ?? ""}`.toLocaleLowerCase("en-IN");
    return branchMatches.has(node.branchKey) || haystack.includes(query);
  });
  const nodeKeys = new Set(nodes.map((node) => node.key));
  const branchKeys = new Set(nodes.map((node) => node.branchKey));
  return {
    ...projection,
    nodes,
    branches: projection.branches.filter((branch) => branchKeys.has(branch.key)),
    edges: projection.edges.filter((edge) => nodeKeys.has(edge.from) && nodeKeys.has(edge.to)),
  };
}

function subscribeDesktop(listener: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const media = window.matchMedia("(min-width: 681px)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function useDesktopMap() {
  return useSyncExternalStore(subscribeDesktop, () => typeof window === "undefined" || !window.matchMedia ? true : window.matchMedia("(min-width: 681px)").matches, () => true);
}

function graphDepths(projection: JourneyProjection) {
  const depth = new Map(projection.nodes.map((node) => [node.key, 0]));
  for (let pass = 0; pass < projection.nodes.length; pass += 1) {
    for (const node of projection.nodes) {
      const dependencies = [...(node.dependsOn ?? []), ...(node.dependsOnAny ?? [])];
      const dependencyDepths = dependencies.map((key) => depth.get(key) ?? 0);
      if (dependencyDepths.length) depth.set(node.key, Math.max(depth.get(node.key) ?? 0, Math.max(...dependencyDepths) + 1));
    }
  }
  return depth;
}

export function graphLayout(projection: JourneyProjection): GraphLayout {
  const depth = graphDepths(projection);
  const maxDepth = Math.max(...depth.values(), 0);
  const width = PADDING * 2 + LANE_LABEL_WIDTH + (maxDepth + 1) * CARD_WIDTH + maxDepth * COLUMN_GAP;
  const nodes: PositionedNode[] = [];
  const lanes: PositionedLane[] = [];
  let laneY = PADDING;

  for (const branch of projection.branches) {
    const branchNodes = projection.nodes.filter((node) => node.branchKey === branch.key);
    const stacks = new Map<number, JourneyNode[]>();
    for (const node of branchNodes) {
      const nodeDepth = depth.get(node.key) ?? 0;
      stacks.set(nodeDepth, [...(stacks.get(nodeDepth) ?? []), node]);
    }
    const stackSize = Math.max(1, ...[...stacks.values()].map((stack) => stack.length));
    const laneHeight = PADDING * 2 + stackSize * CARD_HEIGHT + Math.max(0, stackSize - 1) * ROW_GAP;
    lanes.push({ branch, x: PADDING, y: laneY, width: width - PADDING * 2, height: laneHeight });
    for (const [nodeDepth, stack] of stacks) {
      stack.forEach((node, row) => nodes.push({
        node,
        x: PADDING + LANE_LABEL_WIDTH + nodeDepth * (CARD_WIDTH + COLUMN_GAP),
        y: laneY + PADDING + row * (CARD_HEIGHT + ROW_GAP),
      }));
    }
    laneY += laneHeight + LANE_GAP;
  }

  return { width, height: laneY - LANE_GAP + PADDING, nodes, lanes };
}

function statusLabel(node: JourneyNode, branch: JourneyBranch) {
  if (node.applicability === "pending" || branch.applicability === "pending") return "Needs details";
  if (node.applicability === "not_applicable" || branch.applicability === "not_applicable") return "Not needed";
  if (!branch.active) return "Optional";
  if (node.status === "completed") return "Done";
  if (node.status === "waiting_external") return "Waiting";
  if (node.status === "in_progress") return "In progress";
  if (node.status === "blocked") return "Needs attention";
  if (node.status === "available") return node.contributesToCompletion ? "Ready" : "Available";
  return "Later";
}

function nodeKindLabel(node: JourneyNode) {
  if (node.kind === "external_decision") return "Authority decision";
  if (node.kind === "recurring") return "Recurring duty";
  if (node.kind === "milestone") return "Milestone";
  if (node.kind === "decision") return "Choice";
  return node.contributesToCompletion ? "Step" : "Information";
}

function branchKindLabel(branch: JourneyBranch) {
  if (branch.requirement === "required") return "Required";
  if (branch.requirement === "optional") return branch.active ? "Added" : "Optional";
  if (branch.applicability === "pending") return "Needs details";
  if (branch.applicability === "not_applicable") return "Not needed";
  return "Applies";
}

function isBranchEntry(node: JourneyNode, projection: JourneyProjection) {
  const branchNodes = projection.nodes.filter((candidate) => candidate.branchKey === node.branchKey);
  return (node.dependsOn ?? []).every((dependency) => !branchNodes.some((member) => member.key === dependency));
}

function JourneyMapCard({ id, node, projection }: { id: string; node: JourneyNode; projection: JourneyProjection }) {
  const { state, activateBranch } = useJourney();
  const branch = projection.branches.find((candidate) => candidate.key === node.branchKey)!;
  const canOpenWorkflow = node.action !== "none" && branch.active && node.applicability === "applicable" && node.status !== "locked" && node.status !== "skipped";
  const canAddBranch = branch.requirement === "optional" && !branch.active && isBranchEntry(node, projection);
  const stateText = statusLabel(node, branch);

  return <article className={`journey-map-node ${node.status} ${branch.active ? "branch-active" : "branch-inactive"} applicability-${node.applicability} node-kind-${node.kind ?? "task"}`}>
    <header>
      <span className="journey-map-node-icon"><JourneyNodeIcon name={node.icon} /></span>
      <div><small>{nodeKindLabel(node)} · {node.timing}</small><h3>{node.title}</h3></div>
    </header>
    <p>{node.description}</p>
    <p className="journey-map-source" title={node.source?.authority}>{node.source?.authority}</p>
    <footer>
      <span className={`journey-map-state ${node.status} applicability-${node.applicability}`}>{node.status === "completed" ? <CheckCircle2 aria-hidden="true" /> : node.status === "locked" && node.applicability === "applicable" ? <LockKeyhole aria-hidden="true" /> : null}{stateText}</span>
      {canAddBranch
        ? <button type="button" disabled={state.pending} onClick={() => void activateBranch(id, branch.key)} aria-label={`Add ${branch.title}`}><Plus aria-hidden="true" />{state.pending ? "Adding…" : "Add"}</button>
        : canOpenWorkflow
          ? <DialogPrimitive.Close asChild><Link href={journeyNodeHref(id, node.key)}>Open<ArrowRight aria-hidden="true" /></Link></DialogPrimitive.Close>
          : node.source ? <a href={node.source.href} target="_blank" rel="noreferrer">Official info<ExternalLink aria-hidden="true" /></a> : null}
    </footer>
  </article>;
}

function edgePath(edge: JourneyEdgeDefinition, positions: Map<string, PositionedNode>) {
  const from = positions.get(edge.from);
  const to = positions.get(edge.to);
  if (!from || !to) return null;
  const startX = from.x + CARD_WIDTH;
  const startY = from.y + CARD_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + CARD_HEIGHT / 2;
  if (endX > startX) {
    const bend = Math.max(28, (endX - startX) / 2);
    return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX - 8} ${endY}`;
  }
  const lift = 44;
  return `M ${startX} ${startY} C ${startX + lift} ${startY - lift}, ${endX - lift} ${endY - lift}, ${endX - 8} ${endY}`;
}

function JourneyGraph({ id, projection }: { id: string; projection: JourneyProjection }) {
  const desktop = useDesktopMap();
  const layout = graphLayout(projection);
  const positions = new Map(layout.nodes.map((item) => [item.node.key, item]));
  const titleByKey = new Map(projection.nodes.map((node) => [node.key, node.title]));
  if (!projection.nodes.length) return <div className="journey-map-empty"><Search aria-hidden="true" /><h2>No matching steps</h2><p>Try a broader search or show the entire journey.</p></div>;
  return <section className="journey-map-viewport" aria-label="Journey dependency map">
    {desktop ? <div className="journey-map-canvas" style={{ width: layout.width, height: layout.height }}>
      {layout.lanes.map(({ branch, x, y, width, height }) => <section className={`journey-map-lane requirement-${branch.requirement} applicability-${branch.applicability}`} style={{ transform: `translate(${x}px, ${y}px)`, width, height }} key={branch.key} aria-label={`${branch.title} branch`}>
        <div className="journey-map-lane-label"><span className={`journey-branch-kind ${branch.requirement}`}>{branchKindLabel(branch)}</span><h2>{branch.title}</h2><p>{branch.description}</p></div>
      </section>)}
      <svg aria-hidden="true" className="journey-map-edges" viewBox={`0 0 ${layout.width} ${layout.height}`}>
        <defs><marker id="journey-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
        {projection.edges.map((edge) => {
          const path = edgePath(edge, positions);
          return path ? <path className={`edge-${edge.type}`} key={`${edge.from}-${edge.to}-${edge.type}`} d={path} markerEnd="url(#journey-arrow)"><title>{edge.label ?? edge.type}</title></path> : null;
        })}
      </svg>
      {layout.nodes.map(({ node, x, y }) => <div className="journey-map-node-position" style={{ transform: `translate(${x}px, ${y}px)` }} key={node.key}><JourneyMapCard id={id} node={node} projection={projection} /></div>)}
    </div> : <div className="journey-map-mobile-list">
      {projection.branches.map((branch) => <section key={branch.key} className={`journey-map-mobile-branch requirement-${branch.requirement} applicability-${branch.applicability}`}>
        <header><span className={`journey-branch-kind ${branch.requirement}`}>{branchKindLabel(branch)}</span><h2>{branch.title}</h2><p>{branch.description}</p></header>
        <ol>{projection.nodes.filter((node) => node.branchKey === branch.key).map((node) => <li key={node.key}>
          {(node.dependsOn ?? []).length ? <p>After {(node.dependsOn ?? []).map((key) => titleByKey.get(key) ?? key).join(" and ")}</p> : <p>Branch start</p>}
          <JourneyMapCard id={id} node={node} projection={projection} />
        </li>)}</ol>
      </section>)}
    </div>}
  </section>;
}

export function JourneyMapDrawer({ id, title }: { id: string; title: string }) {
  const { state } = useJourney();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const open = searchParams.get("view") === "map";
  const scope = searchParams.get("mapScope") === "all" ? "all" as const : "relevant" as const;
  const query = searchParams.get("mapQuery") ?? "";
  const visibleProjection = filterJourneyProjection(state.projection, { scope, query });
  const progressNodes = journeyProgressNodes(state.projection);
  const completed = progressNodes.filter((node) => node.status === "completed" || node.status === "skipped").length;
  const optionalCount = state.projection.branches.filter((branch) => branch.requirement === "optional" && !branch.active).length;
  const contextCount = state.projection.branches.filter((branch) => branch.requirement === "conditional" && branch.applicability === "pending").length;

  function setOpen(nextOpen: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextOpen) params.set("view", "map"); else params.delete("view");
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function setMapFilter(next: { scope?: "relevant" | "all"; query?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextScope = next.scope ?? scope;
    const nextQuery = next.query ?? query;
    if (nextScope === "all") params.set("mapScope", "all"); else params.delete("mapScope");
    if (nextQuery.trim()) params.set("mapQuery", nextQuery); else params.delete("mapQuery");
    params.set("view", "map");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return <div className="journey-map-launch content-layer">
    <button type="button" className="secondary-button" onClick={() => setOpen(true)}><Route aria-hidden="true" />View journey map</button>
    <p><strong>{completed} of {progressNodes.length} current steps done</strong><span>{contextCount > 0 ? `${contextCount} ${contextCount === 1 ? "route needs" : "routes need"} more details` : optionalCount > 0 ? `${optionalCount} optional ${optionalCount === 1 ? "route" : "routes"} available` : "Your current routes are shown"}</span></p>
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="journey-map-overlay" />
        <DialogPrimitive.Content className="journey-map-drawer" aria-describedby="journey-map-description">
          <header className="journey-map-header">
            <div><p><GitBranch aria-hidden="true" />{title}</p><DialogPrimitive.Title className="journey-map-title">Your complete journey map</DialogPrimitive.Title><DialogPrimitive.Description className="journey-map-description" id="journey-map-description">See required work, routes that depend on your details, optional services, future duties and official decisions in one place.</DialogPrimitive.Description></div>
            <DialogPrimitive.Close className="journey-map-close" aria-label="Close journey map"><X aria-hidden="true" /></DialogPrimitive.Close>
          </header>
          <div className="journey-map-legend" aria-label="Journey map legend"><span><i className="required" />Required</span><span><i className="conditional" />Depends on details</span><span><i className="optional" />Optional</span><span><b className="edge-line hard" />Must happen first</span><span><b className="edge-line alternative" />Alternative or related</span></div>
          <div className="journey-map-tools">
            <label><Search aria-hidden="true" /><span className="sr-only">Search journey steps</span><input type="search" name="mapQuery" value={query} onChange={(event) => setMapFilter({ query: event.target.value })} placeholder="Search steps or authorities…" /></label>
            <div role="group" aria-label="Journey map scope"><button type="button" aria-pressed={scope === "relevant"} onClick={() => setMapFilter({ scope: "relevant" })}>Relevant now</button><button type="button" aria-pressed={scope === "all"} onClick={() => setMapFilter({ scope: "all" })}>Entire journey</button></div>
            <small>{visibleProjection.nodes.length} of {state.projection.nodes.length} steps shown</small>
          </div>
          {state.error ? <p className="journey-map-error" role="status">{state.error}</p> : null}
          <JourneyGraph id={id} projection={visibleProjection} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  </div>;
}
