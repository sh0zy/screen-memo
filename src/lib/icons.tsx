import {
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Coffee,
  Droplet,
  Dumbbell,
  Flag,
  GraduationCap,
  Heart,
  Hourglass,
  House,
  Laptop,
  LayoutGrid,
  Leaf,
  List,
  Moon,
  Music,
  Palette,
  PenLine,
  Plane,
  Repeat,
  ShoppingBag,
  Star,
  StickyNote,
  Sun,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { IconName } from '../types';

export const ICONS: Record<IconName, LucideIcon> = {
  sun: Sun,
  target: Target,
  flag: Flag,
  list: List,
  calendar: Calendar,
  repeat: Repeat,
  sticky: StickyNote,
  hourglass: Hourglass,
  grid: LayoutGrid,
  book: BookOpen,
  briefcase: Briefcase,
  dumbbell: Dumbbell,
  bag: ShoppingBag,
  laptop: Laptop,
  graduation: GraduationCap,
  heart: Heart,
  home: House,
  palette: Palette,
  coffee: Coffee,
  plane: Plane,
  music: Music,
  pen: PenLine,
  star: Star,
  droplet: Droplet,
  moon: Moon,
  leaf: Leaf,
  wallet: Wallet,
  bell: Bell,
};

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  className,
}: {
  name?: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const C = (name && ICONS[name]) || List;
  return <C size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
