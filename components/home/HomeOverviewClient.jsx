"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AlertTriangleIcon from "@/components/svgs/AlertTriangleIcon";
import BoxIcon from "@/components/svgs/BoxIcon";
import CalculatorIcon from "@/components/svgs/CalculatorIcon";
import ChartIcon from "@/components/svgs/ChartIcon";
import CustomerIcon from "@/components/svgs/CustomerIcon";
import DashboardIcon from "@/components/svgs/DashboardIcon";
import LedgerIcon from "@/components/svgs/LedgerIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import ShoppingBagIcon from "@/components/svgs/ShoppingBagIcon";
import StoreIcon from "@/components/svgs/StoreIcon";
import TakaIcon from "@/components/svgs/TakaIcon";

const FILTERS = {
  en: [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 Days" },
    { key: "14d", label: "14 Days" },
    { key: "1m", label: "1 Month" },
    { key: "3m", label: "3 Months" },
    { key: "6m", label: "6 Months" },
    { key: "1y", label: "1 Year" },
    { key: "all", label: "Lifetime" },
  ],
  bn: [
    { key: "today", label: "আজ" },
    { key: "7d", label: "৭ দিন" },
    { key: "14d", label: "১৪ দিন" },
    { key: "1m", label: "১ মাস" },
    { key: "3m", label: "৩ মাস" },
    { key: "6m", label: "৬ মাস" },
    { key: "1y", label: "১ বছর" },
    { key: "all", label: "লাইফটাইম" },
  ],
};

const HOME_TEXT = {
  en: {
    overviewKicker: "Overview Dashboard",
    overviewTitle: "Business Overview",
    overviewSubtitle: "Track sales, realized profit, collections, stock value, customers, and dues in one place.",
    awaitingData: "Awaiting data",
    noRecentActivity: "No recent activity",
    quickAccess: "Quick Access",
    operationalWorkspaces: "Operational Workspaces",
    jumpArea: "Jump directly into the area you need.",
    recentActivity: "Recent Activity",
    latestMovement: "Latest Movement",
    topCategories: "Top Categories",
    catalogFocus: "Catalog Focus",
    noCategories: "No product categories yet",
    noCategoriesText: "Purchases will automatically grow the product catalog.",
    warrantySnapshot: "Warranty Snapshot",
    coverageStatus: "Coverage Status",
    active: "Active",
    expiring: "Expiring",
    expired: "Expired",
    warrantyActiveText: "Healthy warranty records with enough coverage left.",
    warrantyExpiringText: "Coverage records that need follow-up soon.",
    warrantyExpiredText: "Past records kept for service history reference.",
    noRangeActivity: "No activity for this range",
    noRangeActivityText: "Try a wider filter like 30 days or lifetime.",
    updatedPrefix: "Updated",
    cards: {
      purchase: "Purchase Value",
      sales: "Sales Value",
      profit: "Realized Profit",
      deposit: "Collection",
      expense: "Purchase Payments",
      customers: "Total Customers",
      suppliers: "Total Suppliers",
      receivable: "Receivable Due",
      stockValue: "Stock Cost Value",
      cashBalance: "Total Cash Balance",
      businessValue: "Total Business Value",
    },
    subtitles: {
      purchaseEntries: (count) => `${count} entries`,
      salesEntries: (count, units) => `${count} sales • units ${units}`,
      profit: "Realized only from completed sales",
      deposit: "Without manual deposits",
      expense: "Without manual expenses",
      activeCustomers: (count) => `${count} active customers`,
      purchaseRecords: (count) => `${count} purchase entries`,
      customerDue: (count) => `${count} customer accounts`,
      stockProducts: (count) => `${count} products in stock`,
      cashBalance: "All collection - all expense",
      businessValue: "Due + stock + cash",
    },
  },
  bn: {
    overviewKicker: "অভারভিউ ড্যাশবোর্ড",
    overviewTitle: "ব্যবসার সারসংক্ষেপ",
    overviewSubtitle: "বিক্রি, বাস্তব প্রফিট, আদায়, স্টক ভ্যালু, কাস্টমার এবং বকেয়ার সংক্ষিপ্ত চিত্র।",
    awaitingData: "তথ্য আসছে",
    noRecentActivity: "সাম্প্রতিক কার্যক্রম নেই",
    quickAccess: "দ্রুত প্রবেশ",
    operationalWorkspaces: "অপারেশনাল ওয়ার্কস্পেস",
    jumpArea: "যে অংশে দরকার সরাসরি সেখানে যান।",
    recentActivity: "সাম্প্রতিক কার্যক্রম",
    latestMovement: "সর্বশেষ মুভমেন্ট",
    topCategories: "শীর্ষ ক্যাটাগরি",
    catalogFocus: "ক্যাটালগ ফোকাস",
    noCategories: "এখনো কোনো পণ্য ক্যাটাগরি নেই",
    noCategoriesText: "ক্রয় এন্ট্রি যোগ হলে পণ্য ক্যাটালগ তৈরি হবে।",
    warrantySnapshot: "ওয়ারেন্টি স্ন্যাপশট",
    coverageStatus: "কভারেজ অবস্থা",
    active: "সক্রিয়",
    expiring: "মেয়াদ শেষের পথে",
    expired: "মেয়াদ শেষ",
    warrantyActiveText: "যথেষ্ট কভারেজ বাকি আছে এমন রেকর্ড।",
    warrantyExpiringText: "যেগুলোতে দ্রুত ফলো-আপ দরকার।",
    warrantyExpiredText: "সার্ভিস হিস্টরির জন্য সংরক্ষিত পুরনো রেকর্ড।",
    noRangeActivity: "এই সময়ে কোনো কার্যক্রম নেই",
    noRangeActivityText: "৩০ দিন বা লাইফটাইম ফিল্টার ব্যবহার করে দেখুন।",
    updatedPrefix: "আপডেট",
    cards: {
      purchase: "ক্রয়ের মূল্য",
      sales: "বিক্রির মূল্য",
      profit: "বাস্তব প্রফিট",
      deposit: "আদায়",
      expense: "ক্রয় পরিশোধ",
      customers: "মোট কাস্টমার",
      suppliers: "মোট সাপ্লায়ার",
      receivable: "বকেয়া আদায়যোগ্য",
      stockValue: "স্টক ক্রয়মূল্য",
      cashBalance: "সর্বমোট ক্যাশ ব্যালেন্স",
      businessValue: "মোট ব্যবসার মূল্য",
    },
    subtitles: {
      purchaseEntries: (count) => `${count} টি এন্ট্রি`,
      salesEntries: (count, units) => `${count} টি বিক্রয় • পণ্য ${units}`,
      profit: "শুধু সম্পন্ন বিক্রয় থেকে হিসাব করা হয়েছে",
      deposit: "ম্যানুয়াল জমা ছাড়া",
      expense: "ম্যানুয়াল খরচ যুক্ত নয়",
      activeCustomers: (count) => `${count} জন সক্রিয়`,
      purchaseRecords: (count) => `${count} টি ক্রয় এন্ট্রি আছে`,
      customerDue: (count) => `${count} জন কাস্টমারের কাছে`,
      stockProducts: (count) => `${count} টি পণ্য স্টকে`,
      cashBalance: "সব জমা - সব খরচ",
      businessValue: "বকেয়া + স্টক + ক্যাশ",
    },
  },
};

const WORKSPACE_ICONS = {
  dashboard: DashboardIcon,
  purchase: ShoppingBagIcon,
  sales: ReceiptIcon,
  products: BoxIcon,
  stock: ChartIcon,
  customers: CustomerIcon,
  due: MoneyIcon,
  warranty: LedgerIcon,
};

function formatCompactCurrency(value, language) {
  return new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value, language) {
  return new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value, language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return HOME_TEXT[language].noRecentActivity;
  }

  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRelativeTime(value, language) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return HOME_TEXT[language].noRecentActivity;
  }

  const minutes = Math.round((date.getTime() - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat(language === "bn" ? "bn" : "en", { numeric: "auto" });

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, "hour");
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, "day");
}

function getRangeStart(filterKey) {
  if (filterKey === "all") {
    return null;
  }

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (filterKey === "today") {
    return start;
  }

  if (filterKey === "7d") {
    start.setDate(start.getDate() - 6);
    return start;
  }

  if (filterKey === "14d") {
    start.setDate(start.getDate() - 13);
    return start;
  }

  if (filterKey === "1m") {
    start.setMonth(start.getMonth() - 1);
    return start;
  }

  if (filterKey === "3m") {
    start.setMonth(start.getMonth() - 3);
    return start;
  }

  if (filterKey === "6m") {
    start.setMonth(start.getMonth() - 6);
    return start;
  }

  if (filterKey === "1y") {
    start.setFullYear(start.getFullYear() - 1);
    return start;
  }

  return start;
}

function isWithinRange(value, rangeStart) {
  if (!rangeStart) {
    return true;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= rangeStart.getTime();
}

export default function HomeOverviewClient(props) {
  const [activeFilter, setActiveFilter] = useState("today");
  const homeLanguage = "en";
  const copy = HOME_TEXT[homeLanguage];
  const filters = FILTERS[homeLanguage];
  const {
    error,
    heroUpdatedAt,
    purchases,
    invoices,
    customers,
    suppliers,
    stockOverview,
    dueSummary,
    warrantySummary,
    workspaceCards,
    activityFeed,
    topCategories,
  } = props;

  const filtered = useMemo(() => {
    const rangeStart = getRangeStart(activeFilter);
    const filteredPurchases = purchases.filter((item) => isWithinRange(item.createdAt, rangeStart));
    const filteredInvoices = invoices.filter((item) => isWithinRange(item.createdAt, rangeStart));
    const filteredActivity = activityFeed.filter((item) => isWithinRange(item.createdAt, rangeStart));

    const purchaseAmount = filteredPurchases.reduce((total, item) => total + Number(item.totalAmount || 0), 0);
    const expenseAmount = filteredPurchases.reduce((total, item) => total + Number(item.paymentAmount || 0), 0);
    const salesAmount = filteredInvoices.reduce((total, item) => total + Number(item.total || 0), 0);
    const profitAmount = filteredInvoices.reduce((total, item) => total + Number(item.profitAmount || 0), 0);
    const collectedAmount = filteredInvoices.reduce((total, item) => total + Number(item.paidAmount || 0), 0);
    const unitsSold = filteredInvoices.reduce((total, item) => total + Number(item.quantity || 0), 0);
    const cashBalance = collectedAmount - expenseAmount;
    const businessAssetValue =
      (stockOverview.totalValue || 0) + Math.max(cashBalance, 0) + (dueSummary.totalReceivable || 0);

    return {
      cards: [
        {
          title: copy.cards.purchase,
          value: formatCompactCurrency(purchaseAmount, homeLanguage),
          subtitle: copy.subtitles.purchaseEntries(formatNumber(filteredPurchases.length, homeLanguage)),
          icon: ShoppingBagIcon,
          tone: "mint",
        },
        {
          title: copy.cards.sales,
          value: formatCompactCurrency(salesAmount, homeLanguage),
          subtitle: copy.subtitles.salesEntries(
            formatNumber(filteredInvoices.length, homeLanguage),
            formatNumber(unitsSold, homeLanguage),
          ),
          icon: ReceiptIcon,
          tone: "blue",
        },
        {
          title: copy.cards.profit,
          value: formatCompactCurrency(profitAmount, homeLanguage),
          subtitle: copy.subtitles.profit,
          icon: ChartIcon,
          tone: "green",
        },
        {
          title: copy.cards.deposit,
          value: formatCompactCurrency(collectedAmount, homeLanguage),
          subtitle: copy.subtitles.deposit,
          icon: MoneyIcon,
          tone: "rose",
        },
        {
          title: copy.cards.expense,
          value: formatCompactCurrency(expenseAmount, homeLanguage),
          subtitle: copy.subtitles.expense,
          icon: AlertTriangleIcon,
          tone: "cyan",
        },
        {
          title: copy.cards.customers,
          value: formatNumber(customers.total, homeLanguage),
          subtitle: copy.subtitles.activeCustomers(formatNumber(customers.active, homeLanguage)),
          icon: CustomerIcon,
          tone: "indigo",
        },
        {
          title: copy.cards.suppliers,
          value: formatNumber(suppliers.total, homeLanguage),
          subtitle: copy.subtitles.purchaseRecords(formatNumber(filteredPurchases.length, homeLanguage)),
          icon: StoreIcon,
          tone: "peach",
        },
        {
          title: copy.cards.receivable,
          value: formatCompactCurrency(dueSummary.totalReceivable || 0, homeLanguage),
          subtitle: copy.subtitles.customerDue(formatNumber(dueSummary.overdueCount || 0, homeLanguage)),
          icon: CalculatorIcon,
          tone: "amber",
        },
        {
          title: copy.cards.stockValue,
          value: formatCompactCurrency(stockOverview.totalValue || 0, homeLanguage),
          subtitle: copy.subtitles.stockProducts(formatNumber(stockOverview.totalProducts || 0, homeLanguage)),
          icon: BoxIcon,
          tone: "soft-blue",
        },
        {
          title: copy.cards.cashBalance,
          value: formatCompactCurrency(cashBalance, homeLanguage),
          subtitle: copy.subtitles.cashBalance,
          icon: TakaIcon,
          tone: "emerald",
        },
        {
          title: copy.cards.businessValue,
          value: formatCompactCurrency(businessAssetValue, homeLanguage),
          subtitle: copy.subtitles.businessValue,
          icon: DashboardIcon,
          tone: "coral",
        },
      ],
      activity: filteredActivity.slice(0, 6),
    };
  }, [activeFilter, activityFeed, copy, customers, dueSummary, homeLanguage, invoices, purchases, stockOverview, suppliers]);

  return (
    <main className="home-dashboard home-dashboard-compact">
      <section className="home-overview-header">
        <div>
          <span className="home-kicker">{copy.overviewKicker}</span>
          <h1>{copy.overviewTitle}</h1>
          <p>{copy.overviewSubtitle}</p>
        </div>
        <div className="home-overview-header-meta">
          <strong>{heroUpdatedAt ? getRelativeTime(heroUpdatedAt, homeLanguage) : copy.awaitingData}</strong>
          <span>{heroUpdatedAt ? `${copy.updatedPrefix} ${formatDate(heroUpdatedAt, homeLanguage)}` : copy.noRecentActivity}</span>
        </div>
      </section>

      <section className="home-filter-bar">
        <div className="home-filter-group">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`home-filter-chip${activeFilter === filter.key ? " home-filter-chip-active" : ""}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="home-warning-banner">
          <AlertTriangleIcon />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="home-overview-grid">
        {filtered.cards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.title} className={`home-overview-card home-overview-card-${card.tone}`}>
              <div className="home-overview-card-head">
                <span className="home-overview-card-icon">
                  <Icon />
                </span>
                <div>
                  <span className="home-overview-card-title">{card.title}</span>
                  <strong>{card.value}</strong>
                </div>
              </div>
              <p>{card.subtitle}</p>
            </article>
          );
        })}
      </section>

      <section className="home-layout">
        <div className="home-main-column">
          <section className="home-panel">
            <div className="home-panel-head">
              <div>
                <span className="home-panel-kicker">{copy.quickAccess}</span>
                <h2>{copy.operationalWorkspaces}</h2>
              </div>
              <p>{copy.jumpArea}</p>
            </div>

            <div className="home-quick-grid">
              {workspaceCards.map((card) => {
                const Icon = WORKSPACE_ICONS[card.iconKey] || DashboardIcon;

                return (
                  <Link key={card.href} href={card.href} className="home-quick-card">
                    <span className="home-quick-card-icon">
                      <Icon />
                    </span>
                    <div>
                      <strong>{card.title}</strong>
                      <p>{card.description}</p>
                      <span>{card.metric}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="home-panel">
            <div className="home-panel-head">
              <div>
                <span className="home-panel-kicker">{copy.recentActivity}</span>
                <h2>{copy.latestMovement}</h2>
              </div>
            </div>

            <div className="home-activity-list">
              {filtered.activity.length ? (
                filtered.activity.map((item) => (
                  <article key={item.id} className="home-activity-item">
                    <div>
                      <span className="home-activity-type">{item.type}</span>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                    <div className="home-activity-meta">
                      <strong>{item.value}</strong>
                      <span>{getRelativeTime(item.createdAt, homeLanguage)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="home-empty-state">
                  <StoreIcon />
                  <div>
                    <strong>{copy.noRangeActivity}</strong>
                    <p>{copy.noRangeActivityText}</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="home-side-column">
          <section className="home-panel">
            <div className="home-panel-head">
              <div>
                <span className="home-panel-kicker">{copy.topCategories}</span>
                <h2>{copy.catalogFocus}</h2>
              </div>
            </div>

            <div className="home-category-list">
              {topCategories.length ? (
                topCategories.map(([name, total], index) => (
                  <article key={name} className="home-category-item">
                    <span className="home-category-rank">0{index + 1}</span>
                    <div>
                      <strong>{name}</strong>
                      <p>{formatNumber(total, homeLanguage)} products in catalog</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="home-empty-state home-empty-state-compact">
                  <BoxIcon />
                  <div>
                    <strong>{copy.noCategories}</strong>
                    <p>{copy.noCategoriesText}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="home-panel">
            <div className="home-panel-head">
              <div>
                <span className="home-panel-kicker">{copy.warrantySnapshot}</span>
                <h2>{copy.coverageStatus}</h2>
              </div>
            </div>

            <div className="home-priority-list">
              <article className="home-priority-card">
                <div>
                  <span>{copy.active}</span>
                  <strong>{formatNumber(warrantySummary.active || 0, homeLanguage)}</strong>
                </div>
                <p>{copy.warrantyActiveText}</p>
              </article>
              <article className="home-priority-card">
                <div>
                  <span>{copy.expiring}</span>
                  <strong>{formatNumber(warrantySummary.expiring || 0, homeLanguage)}</strong>
                </div>
                <p>{copy.warrantyExpiringText}</p>
              </article>
              <article className="home-priority-card">
                <div>
                  <span>{copy.expired}</span>
                  <strong>{formatNumber(warrantySummary.expired || 0, homeLanguage)}</strong>
                </div>
                <p>{copy.warrantyExpiredText}</p>
              </article>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
