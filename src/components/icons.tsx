import { Baby, BadgeCheck, Vote, Banknote, BriefcaseBusiness, CalendarDays, CreditCard, FileText, FolderClock, Gift, HeartPulse, House, IdCard, MailCheck, MapPinned, Rocket, ScrollText, Store, Syringe, Car, Armchair, UserRound, ShieldPlus, Landmark, FileHeart, Hospital, type LucideIcon } from "lucide-react";

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
  home: House,
  address: MapPinned,
  voter: Vote,
  mail: MailCheck,
  business: BriefcaseBusiness,
  store: Store,
  tax: ScrollText,
  launch: Rocket,
  retirement: Armchair,
  pension: Banknote,
  life_certificate: BadgeCheck,
  folder: FolderClock,
};

export const lifeEvents = [
  { key: "baby", label: "Having a Baby", Icon: Baby, active: true, tone: "rose" },
  { key: "home", label: "Moving Home", Icon: House, active: true, tone: "green" },
  { key: "vehicle", label: "Buying a Vehicle", Icon: Car, active: true, tone: "blue" },
  { key: "health", label: "Health & Insurance", Icon: ShieldPlus, active: true, tone: "green" },
  { key: "business", label: "Starting a Business", Icon: Store, active: true, tone: "purple" },
  { key: "retirement", label: "Retirement", Icon: Armchair, active: true, tone: "amber" },
] as const;

export { BadgeCheck };
