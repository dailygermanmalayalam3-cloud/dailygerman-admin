"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(hasDarkClass);
  }, []);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);

    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("dg_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dg_theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 border border-neutral-300 dark:border-neutral-700 p-1.5 opacity-0" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Night Mode"}
      title={isDark ? "Light Mode" : "Night Mode"}
      className="p-1.5 border border-black dark:border-neutral-600 bg-white dark:bg-neutral-900 text-black dark:text-yellow-400 hover:bg-[#ffe600] dark:hover:bg-neutral-800 transition-colors cursor-pointer"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-yellow-400" />
      ) : (
        <Moon className="w-4 h-4 text-black" />
      )}
    </button>
  );
}