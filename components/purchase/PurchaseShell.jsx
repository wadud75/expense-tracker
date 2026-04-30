"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { purchaseIcons } from "@/components/purchase/purchaseContent";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";

const { CloseIcon, GlobeIcon, MenuIcon } = purchaseIcons;

const THEME_STORAGE_KEY = "expense-tracker-theme";

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 15.5A7.5 7.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
    </svg>
  );
}

function getMenuHref(key) {
  if (key === "dashboard") {
    return "/dashboard";
  }

  if (key === "productList") {
    return "/products";
  }

  if (key === "purchase") {
    return "/purchase";
  }

  if (key === "salesPos") {
    return "/sales";
  }

  if (key === "salesList") {
    return "/sales/list";
  }

  if (key === "stock") {
    return "/stock";
  }

  if (key === "due") {
    return "/due";
  }

  if (key === "warranty") {
    return "/warranty";
  }

  if (key === "customers") {
    return "/customers";
  }

  if (key === "sellers") {
    return "/sellers";
  }

  return null;
}

function isMenuItemActive(key, href, pathname) {
  if (!href) {
    return false;
  }

  if (key === "salesPos") {
    return pathname === "/sales";
  }

  if (key === "salesList") {
    return pathname.startsWith("/sales/list");
  }

  return pathname.startsWith(href);
}

export default function PurchaseShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { language, setLanguage, t, menuItems } = usePurchaseLanguage();

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/dashboard/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme =
      savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    setTheme(nextTheme);
    setIsThemeReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <main className="dashboard-shell">
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? "sidebar-backdrop-visible" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/" className="brand-link" onClick={() => setIsSidebarOpen(false)}>
            <div className="brand-mark">
              <Image src="/favicon.jpg" alt="Power Link logo" width={56} height={56} />
            </div>
            <div className="brand-copy">
              <div className="brand-row">
                <h1>{t.brandTitle}</h1>
              </div>
              {t.brandCode ? <p>{t.brandCode}</p> : null}
              {t.brandStore ? <p>{t.brandStore}</p> : null}
            </div>
          </Link>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label={t.closeSidebar}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="sidebar-menu" aria-label={t.menuAriaLabel}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const href = getMenuHref(item.key);
            const isActive = href ? isMenuItemActive(item.key, href, pathname) : item.active;
            const className = `${item.accent} ${isActive ? "sidebar-card-active" : ""}`;

            if (href) {
              return (
                <Link
                  key={item.key}
                  href={href}
                  className={className}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span className="sidebar-card-icon">
                    <Icon />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <button key={item.key} type="button" className={className}>
                <span className="sidebar-card-icon">
                  <Icon />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={t.openSidebar}
            >
              <MenuIcon />
            </button>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="pill-button theme-toggle-button"
              onClick={() => setTheme((currentValue) => (currentValue === "dark" ? "light" : "dark"))}
              aria-label={
                isThemeReady
                  ? theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                  : "Toggle theme"
              }
            >
              {isThemeReady ? (
                <>
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                  <span>{theme === "dark" ? "Light" : "Dark"}</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" style={{ width: 16, height: 16, display: "inline-block" }} />
                  <span>Theme</span>
                </>
              )}
            </button>
            <button
              type="button"
              className="pill-button pill-language"
              onClick={() => setLanguage((currentValue) => (currentValue === "en" ? "bn" : "en"))}
              aria-label={`Switch language to ${language === "en" ? "Bangla" : "English"}`}
            >
              <GlobeIcon />
              <span>{t.languageLabel}</span>
            </button>
            <button type="button" className="pill-button pill-logout" onClick={handleLogout} disabled={isLoggingOut}>
              <span>{isLoggingOut ? t.loggingOut || "Logging out..." : t.logout || "Logout"}</span>
            </button>
          </div>
        </header>

        {children}

        <footer className="dashboard-footer">
          <div className="dashboard-footer-shell">
            <div className="dashboard-footer-brand">
              <span className="dashboard-footer-kicker">Operations Hub</span>
              <h2>Power Link</h2>
              <p>
                Built for daily purchase flow, seller operations, stock visibility, and cleaner business control
                across desktop and mobile.
              </p>
            </div>

          </div>

          <div className="dashboard-footer-bottom">
            <span>© {new Date().getFullYear()} Power Link</span>
            <span>Inventory, sales, due, warranty, and seller management</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
