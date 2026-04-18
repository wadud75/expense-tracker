"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import StoreIcon from "@/components/svgs/StoreIcon";

const SELLER_CREATED_EVENT = "seller:created";
const EMPTY_FORM = {
  id: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  role: "sales executive",
  salary: "",
  status: "active",
  notes: "",
};

function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`;
}

function formatSalary(value) {
  return `Tk ${Number(value || 0).toFixed(0)}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString();
}

function getMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    return "-";
  }

  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getDaysSince(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  return Math.floor((now.getTime() - parsed.getTime()) / 86400000);
}

function getRoleLabel(role) {
  if (!role) {
    return "Other";
  }

  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSellerActivity(summary) {
  if (!summary.orders) {
    return "inactive";
  }

  const daysSinceLastSale = getDaysSince(summary.lastSaleAt);

  if (summary.orders >= 5 || summary.revenue >= 200000) {
    return "leading";
  }

  if (daysSinceLastSale !== null && daysSinceLastSale <= 30) {
    return "active";
  }

  return "cooling";
}

function getSellerActivityLabel(activity) {
  if (activity === "leading") return "Leading";
  if (activity === "active") return "Active";
  if (activity === "cooling") return "Cooling";
  return "Inactive";
}

function getActivityNote(summary, activity) {
  if (!summary.orders) {
    return "No sales registered yet";
  }

  const daysSinceLastSale = getDaysSince(summary.lastSaleAt);

  if (activity === "leading") {
    return `${summary.orders} invoices with strong revenue output`;
  }

  if (activity === "active") {
    return daysSinceLastSale === 0 ? "Sold today" : `Last sale ${daysSinceLastSale} day${daysSinceLastSale === 1 ? "" : "s"} ago`;
  }

  return daysSinceLastSale === null
    ? "Sales history available"
    : `Needs follow-up, last sale ${daysSinceLastSale} day${daysSinceLastSale === 1 ? "" : "s"} ago`;
}

function getActivityTone(activity) {
  if (activity === "leading" || activity === "active") return "settled";
  if (activity === "cooling") return "overdue";
  return "open";
}

function buildSalaryHistory(seller, monthsToShow = 6) {
  const paymentMap = new Map((seller.salaryPayments || []).map((entry) => [entry.monthKey, entry]));
  const history = [];
  const today = new Date();

  for (let index = 0; index < monthsToShow; index += 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const monthKey = getMonthKey(monthDate);
    const payment = paymentMap.get(monthKey);

    history.push({
      monthKey,
      label: formatMonthLabel(monthKey),
      amount: Number(payment?.amount ?? seller.salary ?? 0),
      status: payment ? "paid" : "unpaid",
      paidAt: payment?.paidAt || "",
      note: payment?.note || "",
    });
  }

  return history;
}

function buildSalesSummary(sales) {
  const summary = {};

  sales.forEach((sale) => {
    const key = normalizeText(sale.sellerName);
    if (!key) return;

    if (!summary[key]) {
      summary[key] = {
        invoices: new Map(),
        units: 0,
        profit: 0,
        customers: new Set(),
        lastSaleAt: "",
      };
    }

    const bucket = summary[key];
    const invoiceKey = sale.invoiceNo || sale.id;

    if (!bucket.invoices.has(invoiceKey)) {
      bucket.invoices.set(invoiceKey, {
        invoiceTotal: Number(sale.invoiceTotal ?? sale.lineTotal ?? 0),
        paidAmount: Number(sale.paidAmount ?? sale.invoiceTotal ?? sale.lineTotal ?? 0),
      });
    }

    bucket.units += Number(sale.quantity || 0);
    bucket.profit += Number(sale.profitAmount || 0);

    if (normalizeText(sale.customerName) && normalizeText(sale.customerName) !== "walk-in customer") {
      bucket.customers.add(sale.customerName.trim());
    }

    const currentTimestamp = new Date(sale.createdAt || 0).getTime();
    const previousTimestamp = new Date(bucket.lastSaleAt || 0).getTime();
    if (currentTimestamp > previousTimestamp) {
      bucket.lastSaleAt = sale.createdAt;
    }
  });

  return Object.fromEntries(
    Object.entries(summary).map(([key, value]) => {
      const invoices = Array.from(value.invoices.values());
      const revenue = invoices.reduce((total, invoice) => total + invoice.invoiceTotal, 0);
      const paid = invoices.reduce((total, invoice) => total + invoice.paidAmount, 0);

      return [
        key,
        {
          orders: invoices.length,
          revenue,
          paid,
          due: Math.max(revenue - paid, 0),
          units: value.units,
          profit: value.profit,
          customers: value.customers.size,
          lastSaleAt: value.lastSaleAt,
        },
      ];
    }),
  );
}

export default function SellerManagementPage() {
  const [sellers, setSellers] = useState([]);
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [salaryActionKey, setSalaryActionKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  async function loadData() {
    try {
      setErrorMessage("");
      const [masterDataResponse, salesResponse] = await Promise.all([
        fetch("/api/master-data", { cache: "no-store" }),
        fetch("/api/sales", { cache: "no-store" }),
      ]);

      const masterDataResult = await masterDataResponse.json();
      const salesResult = await salesResponse.json();

      if (!masterDataResponse.ok) {
        throw new Error(masterDataResult.error || "Failed to load seller records.");
      }

      if (!salesResponse.ok) {
        throw new Error(salesResult.error || "Failed to load sales history.");
      }

      setSellers(masterDataResult.items?.seller || []);
      setSales(salesResult.sales || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load seller workspace.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    function handleSellerCreated(event) {
      const nextSeller = event?.detail?.seller;
      if (!nextSeller?.id) {
        loadData();
        return;
      }

      setSellers((current) =>
        [nextSeller, ...current.filter((seller) => seller.id !== nextSeller.id)].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setFeedback(`${nextSeller.name} added.`);
      setErrorMessage("");
    }

    window.addEventListener(SELLER_CREATED_EVENT, handleSellerCreated);
    return () => window.removeEventListener(SELLER_CREATED_EVENT, handleSellerCreated);
  }, []);

  const salesSummaryBySeller = useMemo(() => buildSalesSummary(sales), [sales]);

  const sellerRecords = useMemo(
    () =>
      sellers
        .map((seller) => {
          const summary = salesSummaryBySeller[normalizeText(seller.name)] || {
            orders: 0,
            revenue: 0,
            paid: 0,
            due: 0,
            units: 0,
            profit: 0,
            customers: 0,
            lastSaleAt: "",
          };
          const activity = getSellerActivity(summary);

          return {
            ...seller,
            ...summary,
            activity,
            activityLabel: getSellerActivityLabel(activity),
            activityNote: getActivityNote(summary, activity),
            salaryHistory: buildSalaryHistory(seller),
          };
        })
        .sort((left, right) => {
          if (right.revenue !== left.revenue) {
            return right.revenue - left.revenue;
          }

          return left.name.localeCompare(right.name);
        }),
    [sellers, salesSummaryBySeller],
  );

  const filteredSellers = useMemo(() => {
    const normalizedSearch = normalizeText(deferredSearchTerm);

    return sellerRecords.filter((seller) => {
      const matchesSearch =
        !normalizedSearch ||
        [seller.name, seller.email, seller.phone, seller.address, seller.role, seller.status, seller.activityLabel, seller.activityNote]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(normalizedSearch));

      if (!matchesSearch) return false;
      if (activityFilter !== "all" && seller.activity !== activityFilter) return false;
      return true;
    });
  }, [activityFilter, deferredSearchTerm, sellerRecords]);

  const leadingCount = sellerRecords.filter((seller) => seller.activity === "leading").length;
  const activeCount = sellerRecords.filter((seller) => seller.activity === "active").length;
  const paidThisMonthCount = sellerRecords.filter((seller) => seller.salaryHistory[0]?.status === "paid").length;

  function openEditModal(seller) {
    setForm({
      id: seller.id,
      name: seller.name || "",
      email: seller.email || "",
      phone: seller.phone || "",
      address: seller.address || "",
      role: seller.role || "other",
      salary: String(seller.salary ?? ""),
      status: seller.status || "active",
      notes: seller.notes || "",
    });
    setFeedback("");
    setErrorMessage("");
    setIsEditModalOpen(true);
  }

  function closeModal() {
    setForm(EMPTY_FORM);
    setIsEditModalOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      setFeedback("");

      const response = await fetch("/api/master-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          type: "seller",
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          role: form.role,
          salary: Number(form.salary) || 0,
          status: form.status,
          notes: form.notes,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save seller.");
      }

      const previousName = sellers.find((seller) => seller.id === form.id)?.name || "";

      setSellers((current) =>
        current
          .map((seller) => (seller.id === result.item.id ? result.item : seller))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
      setSales((current) =>
        current.map((sale) =>
          sale.sellerName === previousName
            ? {
                ...sale,
                sellerName: result.item.name,
              }
            : sale,
        ),
      );
      setFeedback("Seller updated.");
      closeModal();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save seller.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(seller) {
    if (!seller) return;
    if (!window.confirm(`Delete ${seller.name} from seller management?`)) return;

    try {
      setErrorMessage("");
      setFeedback("");

      const response = await fetch("/api/master-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seller.id, type: "seller" }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete seller.");
      }

      setSellers((current) => current.filter((entry) => entry.id !== seller.id));
      setFeedback("Seller deleted.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete seller.");
    }
  }

  async function handleSalaryAction(seller, monthKey, action) {
    const actionKey = `${seller.id}:${monthKey}:${action}`;
    if (salaryActionKey === actionKey) return;

    try {
      setSalaryActionKey(actionKey);
      setErrorMessage("");
      setFeedback("");

      const response = await fetch("/api/master-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: seller.id,
          type: "seller",
          action,
          monthKey,
          amount: seller.salary,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update salary payment.");
      }

      setSellers((current) => current.map((entry) => (entry.id === result.item.id ? result.item : entry)));
      setFeedback(
        action === "pay"
          ? `${seller.name} salary marked paid for ${formatMonthLabel(monthKey)}.`
          : `${seller.name} salary marked unpaid for ${formatMonthLabel(monthKey)}.`,
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to update salary payment.");
    } finally {
      setSalaryActionKey("");
    }
  }

  return (
    <>
      <section className="content-area seller-page seller-page-pro">
        <div className="seller-pro-hero">
          <div className="seller-pro-hero-copy">
            <span className="seller-pro-eyebrow">Seller Operations</span>
            <h2>Seller management</h2>
            <p>Manage your seller roster with a cleaner operational view of revenue, collection exposure, and recent performance.</p>
          </div>

          <div className="seller-pro-hero-actions">
            <button
              type="button"
              className="pill-button seller-pro-refresh"
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
            >
              <RefreshIcon />
              <span>Refresh</span>
            </button>
            <Link href="/sellers/new" className="primary-button seller-pro-add-button">
              <StoreIcon />
              <span>Add seller</span>
            </Link>
          </div>
        </div>

        <div className="seller-pro-summary-grid">
          <article className="seller-pro-summary-card seller-pro-summary-card-amber">
            <span className="seller-pro-summary-icon"><StoreIcon /></span>
            <div className="seller-pro-summary-copy">
              <span>Sellers</span>
              <strong>{sellerRecords.length}</strong>
              <p>Total registered profiles</p>
            </div>
          </article>
          <article className="seller-pro-summary-card seller-pro-summary-card-green">
            <span className="seller-pro-summary-icon"><CheckIcon /></span>
            <div className="seller-pro-summary-copy">
              <span>Leading</span>
              <strong>{leadingCount}</strong>
              <p>High-performing seller profiles</p>
            </div>
          </article>
          <article className="seller-pro-summary-card seller-pro-summary-card-blue">
            <span className="seller-pro-summary-icon"><CalendarIcon /></span>
            <div className="seller-pro-summary-copy">
              <span>Active now</span>
              <strong>{activeCount}</strong>
              <p>Sold within the last 30 days</p>
            </div>
          </article>
          <article className="seller-pro-summary-card seller-pro-summary-card-rose">
            <span className="seller-pro-summary-icon"><MoneyIcon /></span>
            <div className="seller-pro-summary-copy">
              <span>Salary paid</span>
              <strong>{paidThisMonthCount}</strong>
              <p>Profiles marked paid for {formatMonthLabel(getMonthKey())}</p>
            </div>
          </article>
        </div>

        {feedback ? <p className="admin-feedback admin-feedback-success">{feedback}</p> : null}
        {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

        <section className="seller-pro-panel seller-pro-register-panel">
          <div className="seller-pro-panel-head">
            <div>
              <span className="seller-pro-panel-label">Seller register</span>
              <h3>Commercial performance desk</h3>
              <p>Search sellers, review contribution, and keep the checkout roster clean and up to date.</p>
            </div>
            <strong>{filteredSellers.length} visible</strong>
          </div>

          <div className="seller-pro-toolbar">
            <label className="search-field seller-pro-search-field">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search seller, email, phone, role, status, or note"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <select className="purchase-input seller-pro-select" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
              <option value="all">All activity</option>
              <option value="leading">Leading</option>
              <option value="active">Active</option>
              <option value="cooling">Cooling</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="seller-pro-insight">
              <span>Payroll open</span>
              <strong>{sellerRecords.length - paidThisMonthCount}</strong>
              <p>Sellers still unpaid for {formatMonthLabel(getMonthKey())}</p>
            </div>
          </div>

          <div className="seller-pro-table-shell">
            <div className="seller-pro-table-head">
              <span>Seller</span>
              <span>Contact</span>
              <span>Role</span>
              <span>Activity</span>
              <span>Revenue</span>
              <span>Salary</span>
              <span>Actions</span>
            </div>

            {isLoading ? (
              <div className="table-empty">Loading seller workspace...</div>
            ) : filteredSellers.length ? (
              <div className="seller-pro-table-body">
                {filteredSellers.map((seller) => {
                  const currentMonthSalary = seller.salaryHistory[0];
                  const isCurrentMonthPaid = currentMonthSalary?.status === "paid";
                  const currentPayActionKey = `${seller.id}:${currentMonthSalary?.monthKey}:pay`;

                  return (
                    <div key={seller.id} className="seller-pro-row">
                      <span className="seller-pro-cell">
                        <strong>{seller.name}</strong>
                        <small>{seller.address || "No address added"}</small>
                      </span>
                      <span className="seller-pro-cell">
                        <strong>{seller.phone || "-"}</strong>
                        <small>{seller.email || "No email added"}</small>
                      </span>
                      <span className="seller-pro-cell">
                        <strong>{getRoleLabel(seller.role)}</strong>
                        <small>{seller.status || "active"}</small>
                      </span>
                      <span className="seller-pro-cell">
                        <span className={`due-status due-status-${getActivityTone(seller.activity)}`}>{seller.activityLabel}</span>
                        <small>{seller.activityNote}</small>
                      </span>
                      <span className="seller-pro-cell">
                        <strong>{formatCurrency(seller.revenue)}</strong>
                        <small>{seller.orders} invoices, {seller.units} units</small>
                      </span>
                      <span className="seller-pro-cell">
                        <strong>{formatSalary(seller.salary)}</strong>
                        <small>
                          {currentMonthSalary?.label}: {isCurrentMonthPaid ? "Paid" : "Unpaid"}
                        </small>
                      </span>
                      <div className="seller-pro-row-actions">
                        <button
                          type="button"
                          className="outline-button"
                          onClick={() => handleSalaryAction(seller, currentMonthSalary.monthKey, "pay")}
                          disabled={isCurrentMonthPaid || salaryActionKey === currentPayActionKey}
                        >
                          {salaryActionKey === currentPayActionKey ? "Paying..." : "Pay"}
                        </button>
                        <Link href={`/sellers/${seller.id}/history`} className="outline-button">
                          History
                        </Link>
                        <button type="button" className="outline-button" onClick={() => openEditModal(seller)}>Edit</button>
                        <button type="button" className="outline-button seller-pro-delete-button" onClick={() => handleDelete(seller)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="table-empty">No sellers match the current search and filter.</div>
            )}
          </div>

          {!isLoading && filteredSellers.length ? (
            <div className="seller-pro-mobile-grid">
              {filteredSellers.map((seller) => (
                <article key={`mobile-${seller.id}`} className="seller-pro-mobile-card">
                  {(() => {
                    const currentMonthSalary = seller.salaryHistory[0];
                    const isCurrentMonthPaid = currentMonthSalary?.status === "paid";
                    const currentPayActionKey = `${seller.id}:${currentMonthSalary?.monthKey}:pay`;

                    return (
                      <>
                  <div className="seller-pro-mobile-head">
                    <div>
                      <strong>{seller.name}</strong>
                      <p>{seller.address || seller.activityNote}</p>
                    </div>
                    <span className={`due-status due-status-${getActivityTone(seller.activity)}`}>{seller.activityLabel}</span>
                  </div>

                  <div className="seller-pro-mobile-grid-inner">
                    <div><span>Phone</span><strong>{seller.phone || "-"}</strong></div>
                    <div><span>Role</span><strong>{getRoleLabel(seller.role)}</strong></div>
                    <div><span>Revenue</span><strong>{formatCurrency(seller.revenue)}</strong></div>
                    <div><span>Salary</span><strong>{formatSalary(seller.salary)}</strong></div>
                    <div><span>Status</span><strong>{seller.status || "active"}</strong></div>
                    <div><span>Last sale</span><strong>{formatDate(seller.lastSaleAt)}</strong></div>
                    <div><span>This month</span><strong>{isCurrentMonthPaid ? "Paid" : "Unpaid"}</strong></div>
                    <div><span>Paid date</span><strong>{currentMonthSalary?.paidAt ? formatDate(currentMonthSalary.paidAt) : "-"}</strong></div>
                  </div>

                  <div className="seller-pro-mobile-actions">
                    <button
                      type="button"
                      className="outline-button"
                      onClick={() => handleSalaryAction(seller, currentMonthSalary.monthKey, "pay")}
                      disabled={isCurrentMonthPaid || salaryActionKey === currentPayActionKey}
                    >
                      {salaryActionKey === currentPayActionKey ? "Paying..." : "Pay"}
                    </button>
                    <Link href={`/sellers/${seller.id}/history`} className="outline-button">History</Link>
                    <button type="button" className="outline-button" onClick={() => openEditModal(seller)}>Edit</button>
                    <button type="button" className="outline-button seller-pro-delete-button" onClick={() => handleDelete(seller)}>Delete</button>
                  </div>
                      </>
                    );
                  })()}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      {isEditModalOpen ? (
        <div className="route-modal-overlay" onClick={closeModal}>
          <div className="route-modal-shell seller-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header seller-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="seller-pro-panel-label">Seller profile</span>
                    <h1>Edit seller</h1>
                    <p>Update the seller directory while keeping linked sales records aligned.</p>
                  </div>
                </div>
                <button type="button" className="outline-button seller-modal-close" onClick={closeModal}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <form className="seller-pro-form" onSubmit={handleSubmit}>
                    <div className="seller-pro-form-grid">
                      <label className="purchase-field-stack">
                        <span>Seller name</span>
                        <input className="purchase-input" type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Email</span>
                        <input className="purchase-input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Phone</span>
                        <input className="purchase-input" type="text" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Role</span>
                        <select className="purchase-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                          <option value="sales executive">Sales Executive</option>
                          <option value="manager">Manager</option>
                          <option value="cashier">Cashier</option>
                          <option value="support">Support</option>
                          <option value="owner">Owner</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                      <label className="purchase-field-stack">
                        <span>Salary</span>
                        <input className="purchase-input" type="number" min="0" step="1" value={form.salary} onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Status</span>
                        <select className="purchase-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on-leave">On leave</option>
                        </select>
                      </label>
                      <label className="purchase-field-stack seller-pro-form-span-two">
                        <span>Address</span>
                        <input className="purchase-input" type="text" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack seller-pro-form-span-two">
                        <span>Notes</span>
                        <textarea className="purchase-textarea" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                      </label>
                    </div>

                    <div className="seller-pro-form-note">
                      <strong>Performance sync</strong>
                      <p>Renaming a seller also updates the linked seller name inside existing sales records.</p>
                    </div>

                    <div className="seller-pro-action-row">
                      <button type="submit" className="primary-button" disabled={isSaving}>
                        <StoreIcon />
                        <span>{isSaving ? "Saving..." : "Update seller"}</span>
                      </button>
                      <button type="button" className="outline-button" onClick={closeModal}>Cancel</button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
