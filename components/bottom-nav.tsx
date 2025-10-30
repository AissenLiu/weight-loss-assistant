"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, UtensilsCrossed, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/meal", icon: UtensilsCrossed, label: "Meal" },
  { href: "/workout", icon: Dumbbell, label: "Workout" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="border-t bg-card">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
