"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Calendar, Users, PawPrint, FileText, Activity, DollarSign, Pill, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Citas",
    href: "/appointments",
    icon: Calendar,
  },
  {
    title: "Pacientes",
    href: "/patients",
    icon: PawPrint,
  },
  {
    title: "Propietarios",
    href: "/owners",
    icon: Users,
  },
  {
    title: "Historiales",
    href: "/records",
    icon: FileText,
  },
  {
    title: "Tratamientos",
    href: "/treatments",
    icon: Activity,
  },
  {
    title: "Medicamentos",
    href: "/medications",
    icon: Pill,
  },
  {
    title: "Facturación",
    href: "/billing",
    icon: DollarSign,
  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <PawPrint className="h-8 w-8 text-sidebar-primary" />
        <span className="ml-3 text-xl font-semibold text-sidebar-foreground">VetCare Pro</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-sidebar-accent px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
              <span className="text-sm font-semibold">DV</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-sidebar-foreground">Dr. Veterinario</p>
              <p className="text-xs text-sidebar-foreground/60">veterinario@vetcare.com</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
