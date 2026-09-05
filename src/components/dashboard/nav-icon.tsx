import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Gauge,
  Image as ImageIcon,
  LayoutTemplate,
  Megaphone,
  ScrollText,
  Settings,
  Tag,
  Ticket,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

const ICONS = {
  gauge: Gauge,
  layout: LayoutTemplate,
  building: Building2,
  calendar: CalendarDays,
  image: ImageIcon,
  users: Users,
  badge: BadgeCheck,
  wallet: Wallet,
  ticket: Ticket,
  megaphone: Megaphone,
  chart: TrendingUp,
  upload: Upload,
  scroll: ScrollText,
  settings: Settings,
  tag: Tag,
} as const;

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Gauge;
  return <Icon className={className} aria-hidden />;
}
