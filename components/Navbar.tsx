"use client";

import { LayoutGrid, Users, Rocket } from "lucide-react";
import { AnimeNavBar } from "@/components/ui/anime-navbar";

export default function Navbar() {
  const items = [
    { name: "Command", url: "/", icon: LayoutGrid },
    { name: "Agents", url: "/team", icon: Users },
    { name: "Deploy", url: "/tasks/new", icon: Rocket },
  ];

  return (
    <>
      {/* Fixed overlay navbar */}
      <AnimeNavBar items={items} defaultActive="Command" />

      {/* Spacer so content isn't hidden under the fixed navbar */}
      <div className="h-[96px]" />
    </>
  );
}
