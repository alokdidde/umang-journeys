import { BadgeCheck, Building2, CarFront, Folder, House, Landmark, LandPlot, PawPrint, UserRound, UsersRound } from "lucide-react";
import type { LifeEntityKind } from "@/domain/life-entity";

export function LifeEntityIcon({ kind }: { kind: LifeEntityKind }) {
  if (kind === "household") return <UsersRound aria-hidden="true" />;
  if (kind === "organisation") return <Building2 aria-hidden="true" />;
  if (kind === "premises") return <House aria-hidden="true" />;
  if (kind === "property") return <LandPlot aria-hidden="true" />;
  if (kind === "vehicle") return <CarFront aria-hidden="true" />;
  if (kind === "registered_asset") return <BadgeCheck aria-hidden="true" />;
  if (kind === "animal") return <PawPrint aria-hidden="true" />;
  if (kind === "estate") return <Landmark aria-hidden="true" />;
  if (kind === "other") return <Folder aria-hidden="true" />;
  return <UserRound aria-hidden="true" />;
}
