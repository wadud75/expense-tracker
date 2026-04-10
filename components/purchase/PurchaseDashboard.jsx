"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";
import { purchaseIcons } from "@/components/purchase/purchaseContent";

const { CalendarIcon, PlusIcon, SearchIcon } = purchaseIcons;
const QUICK_FILTER_KEYS = ["today", "7days", "30days", "1year", "lifetime"];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function formatAmount(value) {
  return (Number(value) || 0).toFixed(2);
}

function getPurchaseTimestamp(value) {
  if (!value) {
    return 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object" && "$date" in value) {
    const parsed = new Date(value.$date).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getQuickFilterRange(filterKey) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  switch (filterKey) {
    case "today":
      return { start: todayStart, end: todayEnd };
    case "7days":
      return { start: startOfDay(addDays(today, -6)), end: todayEnd };
    case "30days":
      return { start: startOfDay(addDays(today, -29)), end: todayEnd };
    case "1year":
      return { start: startOfDay(addDays(today, -364)), end: todayEnd };
    default:
      return { start: null, end: null };
  }
}

export default function PurchaseDashboard() {
  const { t, statCards, language } = usePurchaseLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuickFilter, setActiveQuickFilter] = useState("lifetime");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPurchases() {
      try {
        const response = await fetch("/api/purchases", { cache: "no-store" });
        const result = await response.json();

        if (isMounted) {
          setPurchases(result.purchases || []);
        }
      } catch {
        if (isMounted) {
          setPurchases([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPurchases();
    return () => {
      isMounted = false;
    };
  }, []);

  const sortedPurchases = useMemo(() => {
    return [...purchases].sort(
      (left, right) => getPurchaseTimestamp(right.createdAt) - getPurchaseTimestamp(left.createdAt),
    );
  }, [purchases]);

  const filteredPurchases = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const parsedStartDate = parseDateInput(startDate);
    const parsedEndDate = parseDateInput(endDate);
    const rangeStart = parsedStartDate ? startOfDay(parsedStartDate) : null;
    const rangeEnd = parsedEndDate ? endOfDay(parsedEndDate) : null;

    let effectiveStart = rangeStart;
    let effectiveEnd = rangeEnd;

    if (effectiveStart && effectiveEnd && effectiveStart.getTime() > effectiveEnd.getTime()) {
      [effectiveStart, effectiveEnd] = [startOfDay(parsedEndDate), endOfDay(parsedStartDate)];
    }

    return sortedPurchases.filter((purchase) => {
      const matchesSearch =
        !normalizedTerm ||
        [purchase.supplierName, purchase.productName, purchase.brandName, purchase.variantName, purchase.categoryName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedTerm));

      if (!matchesSearch) {
        return false;
      }

      const purchaseTimestamp = getPurchaseTimestamp(purchase.createdAt);
      if (!purchaseTimestamp) {
        return !effectiveStart && !effectiveEnd;
      }

      if (effectiveStart && purchaseTimestamp < effectiveStart.getTime()) {
        return false;
      }

      if (effectiveEnd && purchaseTimestamp > effectiveEnd.getTime()) {
        return false;
      }

      return true;
    });
  }, [endDate, searchTerm, sortedPurchases, startDate]);

  const overviewTotals = useMemo(() => {
    return purchases.reduce(
      (summary, purchase) => {
        summary.payments += Number(purchase.paymentAmount) || 0;
        summary.units += Number(purchase.quantity) || 0;
        return summary;
      },
      { payments: 0, units: 0 },
    );
  }, [purchases]);

  const averagePayment = purchases.length ? overviewTotals.payments / purchases.length : 0;
  const displayedStats = [
    purchases.length,
    formatAmount(overviewTotals.payments),
    overviewTotals.units,
    formatAmount(averagePayment),
  ];
  const subtitle =
    language === "bn"
      ? `মোট ${purchases.length} টি ক্রয়`
      : `Total ${purchases.length} purchases`;

  function handleQuickFilterClick(filterKey) {
    setActiveQuickFilter(filterKey);

    if (filterKey === "lifetime") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const { start, end } = getQuickFilterRange(filterKey);
    setStartDate(start ? toDateInputValue(start) : "");
    setEndDate(end ? toDateInputValue(end) : "");
  }

  function handleStartDateChange(event) {
    setActiveQuickFilter(null);
    setStartDate(event.target.value);
  }

  function handleEndDateChange(event) {
    setActiveQuickFilter(null);
    setEndDate(event.target.value);
  }

  return (
    <section className="content-area">
      <div className="section-heading">
        <div>
          <h2>{t.pageTitle}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="section-actions">
          <Link href="/purchase/new" className="primary-button">
            <PlusIcon />
            <span>{t.addPurchase}</span>
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <article key={card.key} className={card.tone}>
              <span className="stat-icon">
                <Icon />
              </span>
              <div>
                <p>{card.title}</p>
                <strong>{displayedStats[index]}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="toolbar">
        <label className="search-field">
          <SearchIcon />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <div className="filter-row">
          <div className="chip-group">
            {t.quickFilters.map((filter, index) => {
              const filterKey = QUICK_FILTER_KEYS[index] || "lifetime";

              return (
                <button
                  key={filter}
                  type="button"
                  className={`filter-chip${activeQuickFilter === filterKey ? " active" : ""}`}
                  onClick={() => handleQuickFilterClick(filterKey)}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <div className="date-row">
            <label className="date-input">
              <CalendarIcon />
              <input type="date" value={startDate} onChange={handleStartDateChange} />
            </label>
            <span className="date-separator">-</span>
            <label className="date-input">
              <CalendarIcon />
              <input type="date" value={endDate} onChange={handleEndDateChange} />
            </label>
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-head">
          {t.tableHeaders.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>

        {isLoading ? (
          <div className="table-empty">Loading...</div>
        ) : filteredPurchases.length ? (
          filteredPurchases.map((purchase) => (
            <div key={purchase.id} className="table-row">
              <span>{formatDate(purchase.createdAt)}</span>
              <span>{purchase.supplierName || "-"}</span>
              <span>{purchase.productName || "-"}</span>
              <span>{purchase.brandName || "-"}</span>
              <span>{purchase.variantName || "-"}</span>
              <span>{purchase.categoryName || "-"}</span>
              <span>{purchase.quantity || 0}</span>
              <span>{formatAmount(purchase.unitPrice)}</span>
              <span>{formatAmount(purchase.paymentAmount)}</span>
            </div>
          ))
        ) : (
          <div className="table-empty">{t.tableEmpty}</div>
        )}
      </div>
    </section>
  );
}
