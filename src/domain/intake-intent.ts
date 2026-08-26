export type SupportedLifeEvent =
  | "having_a_baby"
  | "buying_a_vehicle"
  | "managing_health_cover"
  | "moving_home"
  | "starting_a_business"
  | "retirement";

export function detectLifeEvent(statement: string): SupportedLifeEvent | null {
  const normalized = statement.toLocaleLowerCase("en-IN");
  const isMoving = /\b(move|moving|moved|shift|shifting|new home|new address|relocat)/.test(normalized);
  const isBusiness = /\b(starting|start|launch|opening|open)\b.*\b(business|shop|enterprise|company|firm|studio)\b|\b(business|shop|enterprise|company|firm|studio)\b.*\b(starting|start|launch|opening|open)\b/.test(normalized);
  const isRetirement = /\b(retire|retiring|retirement|pension|epfo|provident fund|nps)\b/.test(normalized);
  const isVehicle = /\b(vehicle|car|bike|scooter|motorcycle|motor insurance|nexon|creta)\b/.test(normalized);
  const isPeopleInsurance = /\b(insurance|policy|cover|coverage)\b/.test(normalized)
    && /\b(parent|parents|mother|father|family|dependant|dependants|dependent|dependents|senior citizen|senior citizens|wife|husband|child|children|myself|me)\b/.test(normalized);
  const isHealth = /health|medical|mediclaim|hospital cover|cashless|abha|ayushman|pm-?jay|health insurance/.test(normalized) || isPeopleInsurance;
  const isBaby = /baby|born|birth|newborn|daughter|son/.test(normalized);

  if (isMoving) return "moving_home";
  if (isBusiness) return "starting_a_business";
  if (isRetirement) return "retirement";
  if (isVehicle) return "buying_a_vehicle";
  if (isHealth) return "managing_health_cover";
  if (isBaby) return "having_a_baby";
  return null;
}

export function isParentHealthRequest(statement: string): boolean {
  const normalized = statement.toLocaleLowerCase("en-IN");
  return detectLifeEvent(statement) === "managing_health_cover"
    && /\b(parent|parents|mother|father|mom|mum|dad)\b/.test(normalized);
}
