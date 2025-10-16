"use client";

import * as SolidIcons from "@heroicons/react/24/solid";
import * as OutlineIcons from "@heroicons/react/24/outline";
import { ComponentType } from "react";

type HeroiconDynamicProps = {
  name?: string;
  outline?: boolean;
  className?: string;
};

export default function HeroiconDynamic({
  name,
  outline = false,
  className = "w-6 h-6 text-black", // ⬅ default: black icons
}: HeroiconDynamicProps) {
  if (!name) return null;

  const formattedName =
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("") + "Icon";

  const icons = outline ? OutlineIcons : SolidIcons;
  const IconComponent = (icons as Record<string, ComponentType<any>>)[formattedName];

  if (!IconComponent) {
    console.warn(`❌ Heroicon not found: ${formattedName}`);
    return <span className="text-gray-400">⭐</span>;
  }

  return <IconComponent className={className} />;
}
