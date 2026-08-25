import { Baby, BadgeCheck, FileText, Gift, HeartPulse, House, IdCard, Syringe, Car, Store, Armchair, type LucideIcon } from "lucide-react";

export const journeyIcons: Record<string, LucideIcon> = {
  baby: Baby,
  certificate: FileText,
  health: HeartPulse,
  vaccine: Syringe,
  identity: IdCard,
  benefits: Gift,
};

export const lifeEvents = [
  { key: "baby", label: "Having a Baby", Icon: Baby, active: true, tone: "rose" },
  { key: "home", label: "Moving Home", Icon: House, active: false, tone: "green" },
  { key: "vehicle", label: "Buying a Vehicle", Icon: Car, active: false, tone: "blue" },
  { key: "business", label: "Starting a Business", Icon: Store, active: false, tone: "purple" },
  { key: "retirement", label: "Retirement", Icon: Armchair, active: false, tone: "amber" },
] as const;

export { BadgeCheck };
