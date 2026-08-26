import type { LifeEventValue } from "./intake-analysis";

export type IntakeJourneyKey = "baby" | "vehicle" | "health" | "home" | "business" | "retirement";

export type IntakeExperience = {
  key: IntakeJourneyKey;
  lifeEvent: LifeEventValue;
  label: string;
  title: string;
  description: string;
  promptLabel: string;
  placeholder: string;
  documentLabel: string;
  sampleLabel: string;
  sampleType: "vehicle_rc" | "health_insurance_policy" | "hospital_discharge_summary" | "residence_proof" | "business_premises_proof" | "retirement_account_statement";
};

export const intakeExperiences: Record<IntakeJourneyKey, IntakeExperience> = {
  baby: {
    key: "baby",
    lifeEvent: "having_a_baby",
    label: "Having a Baby",
    title: "Tell us about the baby’s birth",
    description: "Add the hospital record, or tell us what happened. We’ll fill what we can and ask for anything important that is missing.",
    promptLabel: "Tell us about the birth",
    placeholder: "For example: Our baby was born yesterday at Apollo Hospital in Hyderabad…",
    documentLabel: "Add the hospital discharge summary",
    sampleLabel: "Try a sample hospital record",
    sampleType: "hospital_discharge_summary",
  },
  vehicle: {
    key: "vehicle",
    lifeEvent: "buying_a_vehicle",
    label: "Buying a Vehicle",
    title: "Tell us about the vehicle you bought",
    description: "Add the registration certificate, or describe the purchase. We’ll use AI to fill vehicle details and then ask only what is still needed.",
    promptLabel: "Tell us about the vehicle purchase",
    placeholder: "For example: I bought a used Tata Nexon in Hyderabad last week…",
    documentLabel: "Add the registration certificate (RC)",
    sampleLabel: "Try a sample registration certificate",
    sampleType: "vehicle_rc",
  },
  health: {
    key: "health",
    lifeEvent: "managing_health_cover",
    label: "Health & Insurance",
    title: "Who needs help with health cover?",
    description: "Add a health policy, or explain who needs cover. Each person will keep a separate record.",
    promptLabel: "Tell us who needs health cover",
    placeholder: "For example: I need to arrange health insurance for both of my parents…",
    documentLabel: "Add a health policy or scheme card",
    sampleLabel: "Try a sample health policy",
    sampleType: "health_insurance_policy",
  },
  home: {
    key: "home",
    lifeEvent: "moving_home",
    label: "Moving Home",
    title: "Tell us about your move",
    description: "Add a document for the new address, or describe where and when you are moving.",
    promptLabel: "Tell us about the move",
    placeholder: "For example: We are moving to a rented home in Hyderabad next month…",
    documentLabel: "Add proof of the new address",
    sampleLabel: "Try a sample address document",
    sampleType: "residence_proof",
  },
  business: {
    key: "business",
    lifeEvent: "starting_a_business",
    label: "Starting a Business",
    title: "Tell us about the business you’re starting",
    description: "Add a premises document, or describe the business, its structure and where it will operate.",
    promptLabel: "Tell us about the business",
    placeholder: "For example: I am starting a design business from a rented office in Hyderabad…",
    documentLabel: "Add a principal-place document",
    sampleLabel: "Try a sample premises document",
    sampleType: "business_premises_proof",
  },
  retirement: {
    key: "retirement",
    lifeEvent: "retirement",
    label: "Retirement",
    title: "Tell us about your retirement",
    description: "Add an EPFO, NPS or pension statement, or describe your employment and expected retirement date.",
    promptLabel: "Tell us about the retirement",
    placeholder: "For example: I retire from private employment next month and have an EPFO account…",
    documentLabel: "Add a retirement account statement",
    sampleLabel: "Try a sample retirement statement",
    sampleType: "retirement_account_statement",
  },
};

export function intakeExperience(value: string | null) {
  if (!value || !(value in intakeExperiences)) return null;
  return intakeExperiences[value as IntakeJourneyKey];
}
