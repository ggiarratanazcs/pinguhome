import {
  Apple,
  Croissant,
  CupSoda,
  Fish,
  Milk,
  PawPrint,
  ShoppingBasket,
  Snowflake,
  Sparkles,
  SprayCan,
  Wheat,
  type LucideIcon,
} from "lucide-react";

const ICONE: Record<string, LucideIcon> = {
  apple: Apple,
  croissant: Croissant,
  fish: Fish,
  milk: Milk,
  wheat: Wheat,
  snowflake: Snowflake,
  "cup-soda": CupSoda,
  "spray-can": SprayCan,
  sparkles: Sparkles,
  "paw-print": PawPrint,
  "shopping-basket": ShoppingBasket,
};

export function IconaReparto({ icona, className }: { icona: string | undefined; className?: string }) {
  const Icona = (icona && ICONE[icona]) || ShoppingBasket;
  return <Icona className={className} strokeWidth={1.9} />;
}
