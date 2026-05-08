"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GitBranch,
  MessageSquare,
  CalendarDays,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  Gamepad2,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { NotificationBell } from "./NotificationBell";
import { FeedbackButton } from "./FeedbackButton";
import { useLanguage } from "@/lib/language";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = [
    { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
    { href: "/skills", labelKey: "skills", icon: GitBranch },
    { href: "/materials", label: "Materials", icon: BookOpen },
    { href: "/games", label: "Games", icon: Gamepad2 },
    { href: "/chat", labelKey: "aiCoach", icon: MessageSquare },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/settings", labelKey: "settings", icon: Settings },
  ];

  const navContent = (
    <>
      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl glass-nav-active"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <motion.span
                className="relative z-10"
                whileHover={{ y: -2, rotate: -4 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <item.icon size={18} />
              </motion.span>
              <span className="relative z-10 text-sm font-medium">
                {"label" in item ? item.label : t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.08]">
        <NotificationBell />
        <FeedbackButton />
        <ThemeToggle />
        <LanguageToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-colors"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">{t("signOut")}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 glass-sidebar border-b border-white/[0.08] flex items-center justify-between px-4 z-50">
        <Link href="/dashboard">
          <motion.span
            className="text-lg font-bold text-foreground"
            animate={{
              textShadow: ["0 0 0px #38bdf8", "0 0 10px #38bdf8", "0 0 0px #38bdf8"],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            Study <span className="text-primary">Habits</span>
          </motion.span>
        </Link>
        <motion.button
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.9 }}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X size={22} />
              </motion.span>
            ) : (
              <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Menu size={22} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Mobile slide-over backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="md:hidden fixed top-14 left-0 bottom-0 w-64 glass-sidebar border-r border-white/[0.08] flex flex-col z-50"
          >
            {navContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 glass-sidebar border-r border-white/[0.08] flex-col z-50">
        <div className="p-6">
          <Link href="/dashboard">
            <motion.span
              className="text-xl font-bold text-foreground"
              animate={{
                textShadow: ["0 0 0px #38bdf8", "0 0 12px #38bdf8", "0 0 0px #38bdf8"],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              Study <span className="text-primary">Habits</span>
            </motion.span>
          </Link>
        </div>
        {navContent}
      </aside>
    </>
  );
}
