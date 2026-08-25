import { Baby, BadgeCheck, CalendarDays, CreditCard, FileText, Gift, HeartPulse, House, IdCard, Syringe, Car, Store, Armchair, UserRound, ShieldPlus, Landmark, FileHeart, Hospital, type LucideIcon } from "lucide-react";

export const journeyIcons: Record<string, LucideIcon> = {
  baby: Baby,
  certificate: FileText,
  health: HeartPulse,
  vaccine: Syringe,
  identity: IdCard,
  benefits: Gift,
  vehicle: Car,
  transfer: FileText,
  insurance: BadgeCheck,
  fastag: CreditCard,
  calendar: CalendarDays,
  person: UserRound,
  coverage: ShieldPlus,
  scheme: Landmark,
  records: FileHeart,
  care: Hospital,
};

export const lifeEvents = [
  { key: "baby", label: "Having a Baby", Icon: Baby, active: true, tone: "rose" },
  { key: "home", label: "Moving Home", Icon: House, active: false, tone: "green" },
  { key: "vehicle", label: "Buying a Vehicle", Icon: Car, active: true, tone: "blue" },
  { key: "health", label: "Health & Insurance", Icon: ShieldPlus, active: true, tone: "green" },
  { key: "business", label: "Starting a Business", Icon: Store, active: false, tone: "purple" },
  { key: "retirement", label: "Retirement", Icon: Armchair, active: false, tone: "amber" },
] as const;

export { BadgeCheck };
