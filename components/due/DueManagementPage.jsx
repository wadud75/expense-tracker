"use client";

import { useEffect, useMemo, useState } from "react";
import AlertTriangleIcon from "@/components/svgs/AlertTriangleIcon";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import PlusIcon from "@/components/svgs/PlusIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import TakaIcon from "@/components/svgs/TakaIcon";

const EMPTY_FORM = {
  direction: "receivable",
  partyName: "",
  reference: "",
  category: "",
  totalAmount: "",
  paidAmount: "",
  dueDate: "",
  note: "",
};

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
}

function normalizeStatusPriority(status) {
  if (status === "overdue") {
    return 0;
  }

  if (status === "open") {
    return 1;
  }

  return 2;
}

function getMetaLine(record) {
  if (record.sourceType === "sale") {
    const products = record.meta?.products || [];
    return products.length ? products.join(", ") : "Customer invoice";
  }

  if (record.sourceType === "purchase") {
    const pieces = [
      record.reference,
      record.meta?.categoryName,
      record.meta?.brandName,
      record.meta?.variantName,
    ].filter(Boolean);
    return pieces.join(" | ") || "Supplier bill";
  }

  return record.note || record.meta?.category || "Manual settlement entry";
}

function getPaymentButtonLabel(direction) {
  return direction === "receivable" ? "Collect" : "Pay";
}

export default function DueManagementPage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    overdueAmount: 0,
    overdueCount: 0,
    openCount: 0,
    settledCount: 0,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentDrafts, setPaymentDrafts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadDueData() {
    try {
      setErrorMessage("");
      const response = await fetch("/api/due-management", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load due records.");
      }

      setRecords(result.records || []);
      setSummary(result.summary || {});
    } catch (error) {
      setErrorMessage(error.message || "Failed to load due records.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDueData();
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...records]
      .filter((record) => {
        const matchesSearch =
          !normalizedSearch ||
          [
            record.partyName,
            record.reference,
            record.note,
            record.sourceLabel,
            getMetaLine(record),
          ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch));

        if (!matchesSearch) {
          return false;
        }

        if (statusFilter !== "all" && record.status !== statusFilter) {
          return false;
        }

        if (directionFilter !== "all" && record.direction !== directionFilter) {
          return false;
        }

        if (sourceFilter !== "all" && record.sourceType !== sourceFilter) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        const priorityDelta =
          normalizeStatusPriority(left.status) - normalizeStatusPriority(right.status);
        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        const leftTime = left.dueDate ? new Date(left.dueDate).getTime() : 0;
        const rightTime = right.dueDate ? new Date(right.dueDate).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [directionFilter, records, searchTerm, sourceFilter, statusFilter]);

  const focusItems = useMemo(
    () => filteredRecords.filter((record) => record.status !== "settled").slice(0, 4),
    [filteredRecords],
  );

  async function handleCreateEntry(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/due-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create due entry.");
      }

      setForm(EMPTY_FORM);
      setSuccessMessage("Manual due entry saved.");
      await loadDueData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to create due entry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecordPayment(record) {
    const draftAmount = Number(paymentDrafts[record.id] || 0);

    if (!draftAmount || draftAmount <= 0 || activePaymentId) {
      return;
    }

    setActivePaymentId(record.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const referenceId = record.sourceType === "sale" ? record.reference : record.id;
      const response = await fetch("/api/due-management", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: record.sourceType,
          referenceId,
          amount: draftAmount,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to record payment.");
      }

      setPaymentDrafts((current) => ({
        ...current,
        [record.id]: "",
      }));
      setSuccessMessage(`${getPaymentButtonLabel(record.direction)} payment recorded.`);
      await loadDueData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to record payment.");
    } finally {
      setActivePaymentId("");
    }
  }

  return (
    <section className="content-area due-page">
      <div className="due-hero">
        <div className="due-hero-copy">
          <span className="due-eyebrow">Cashflow Control</span>
          <h2>Due management</h2>
          <p>
            Track receivables and payables from sales, purchases, and manual entries in one
            operational dashboard.
          </p>
        </div>

        <div className="due-hero-actions">
          <button
            type="button"
            className="pill-button due-refresh-button"
            onClick={() => {
              setIsLoading(true);
              loadDueData();
            }}
          >
            <span className="sales-inline-icon">
              <RefreshIcon />
            </span>
            <span>Refresh due board</span>
          </button>
        </div>
      </div>

      <div className="due-summary-grid">
        <article className="due-summary-card due-summary-card-green">
          <span className="due-summary-icon">
            <TakaIcon />
          </span>
          <div>
            <span>Total receivable</span>
            <strong>{formatCurrency(summary.totalReceivable)}</strong>
            <p>Outstanding collections expected from customers and manual claims</p>
          </div>
        </article>

        <article className="due-summary-card due-summary-card-rose">
          <span className="due-summary-icon">
            <MoneyIcon />
          </span>
          <div>
            <span>Total payable</span>
            <strong>{formatCurrency(summary.totalPayable)}</strong>
            <p>Unsettled supplier bills and manual obligations</p>
          </div>
        </article>

        <article className="due-summary-card due-summary-card-amber">
          <span className="due-summary-icon">
            <AlertTriangleIcon />
          </span>
          <div>
            <span>Overdue exposure</span>
            <strong>{formatCurrency(summary.overdueAmount)}</strong>
            <p>{summary.overdueCount || 0} records are already past their due date</p>
          </div>
        </article>

        <article className="due-summary-card due-summary-card-blue">
          <span className="due-summary-icon">
            <ReceiptIcon />
          </span>
          <div>
            <span>Open records</span>
            <strong>{summary.openCount || 0}</strong>
            <p>{summary.settledCount || 0} records are fully settled</p>
          </div>
        </article>
      </div>

      {successMessage ? <p className="admin-feedback admin-feedback-success">{successMessage}</p> : null}
      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="due-layout">
        <div className="due-main-panel">
          <div className="due-filter-bar">
            <label className="search-field due-search-field">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search party, invoice, item, or note"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <div className="due-filter-row">
              <div className="purchase-select-wrap due-select-wrap">
                <select
                  className="purchase-input purchase-select-input due-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All status</option>
                  <option value="open">Open</option>
                  <option value="overdue">Overdue</option>
                  <option value="settled">Settled</option>
                </select>
                <span className="purchase-select-arrow" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path d="m5 7 5 5 5-5" />
                  </svg>
                </span>
              </div>

              <div className="purchase-select-wrap due-select-wrap">
                <select
                  className="purchase-input purchase-select-input due-select"
                  value={directionFilter}
                  onChange={(event) => setDirectionFilter(event.target.value)}
                >
                  <option value="all">All flow</option>
                  <option value="receivable">Receivable</option>
                  <option value="payable">Payable</option>
                </select>
                <span className="purchase-select-arrow" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path d="m5 7 5 5 5-5" />
                  </svg>
                </span>
              </div>

              <div className="purchase-select-wrap due-select-wrap">
                <select
                  className="purchase-input purchase-select-input due-select"
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <option value="all">All sources</option>
                  <option value="sale">Sales invoices</option>
                  <option value="purchase">Purchase bills</option>
                  <option value="manual">Manual entries</option>
                </select>
                <span className="purchase-select-arrow" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path d="m5 7 5 5 5-5" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div className="due-table-card">
            <div className="due-table-head">
              <span>Party</span>
              <span>Source</span>
              <span>Reference</span>
              <span>Due date</span>
              <span>Total</span>
              <span>Paid</span>
              <span>Balance</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {isLoading ? (
              <div className="table-empty">Loading due records...</div>
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => (
                <div key={`${record.sourceType}-${record.id}`} className="due-table-row">
                  <div className="due-party-block">
                    <strong>{record.partyName}</strong>
                    <p>{getMetaLine(record)}</p>
                  </div>
                  <span className={`due-pill due-pill-${record.direction}`}>
                    {record.sourceLabel}
                  </span>
                  <span>{record.reference || "-"}</span>
                  <span>{formatDate(record.dueDate || record.createdAt)}</span>
                  <span>{formatCurrency(record.totalAmount)}</span>
                  <span>{formatCurrency(record.paidAmount)}</span>
                  <strong className="due-balance-cell">{formatCurrency(record.dueAmount)}</strong>
                  <span className={`due-status due-status-${record.status}`}>{record.status}</span>
                  <div className="due-action-cell">
                    {record.dueAmount > 0 ? (
                      <>
                        <input
                          className="purchase-input due-payment-input"
                          type="number"
                          min="0"
                          max={record.dueAmount}
                          step="0.01"
                          placeholder={record.dueAmount.toFixed(2)}
                          value={paymentDrafts[record.id] || ""}
                          onChange={(event) =>
                            setPaymentDrafts((current) => ({
                              ...current,
                              [record.id]: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="primary-button due-action-button"
                          onClick={() => handleRecordPayment(record)}
                          disabled={activePaymentId === record.id}
                        >
                          <CheckIcon />
                          <span>
                            {activePaymentId === record.id
                              ? "Saving..."
                              : getPaymentButtonLabel(record.direction)}
                          </span>
                        </button>
                      </>
                    ) : (
                      <span className="due-settled-text">Settled</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="table-empty">No due records match the current filters.</div>
            )}
          </div>

          {!isLoading && filteredRecords.length ? (
            <div className="due-mobile-grid">
              {filteredRecords.map((record) => (
                <article key={`mobile-${record.sourceType}-${record.id}`} className="due-mobile-card">
                  <div className="due-mobile-head">
                    <div>
                      <strong>{record.partyName}</strong>
                      <p>{record.sourceLabel}</p>
                    </div>
                    <span className={`due-status due-status-${record.status}`}>{record.status}</span>
                  </div>

                  <div className="due-mobile-details">
                    <div>
                      <span>Reference</span>
                      <strong>{record.reference || "-"}</strong>
                    </div>
                    <div>
                      <span>Due date</span>
                      <strong>{formatDate(record.dueDate || record.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{formatCurrency(record.totalAmount)}</strong>
                    </div>
                    <div>
                      <span>Paid</span>
                      <strong>{formatCurrency(record.paidAmount)}</strong>
                    </div>
                    <div>
                      <span>Balance</span>
                      <strong>{formatCurrency(record.dueAmount)}</strong>
                    </div>
                    <div>
                      <span>Details</span>
                      <strong>{getMetaLine(record)}</strong>
                    </div>
                  </div>

                  {record.dueAmount > 0 ? (
                    <div className="due-mobile-action">
                      <input
                        className="purchase-input due-payment-input"
                        type="number"
                        min="0"
                        max={record.dueAmount}
                        step="0.01"
                        placeholder={record.dueAmount.toFixed(2)}
                        value={paymentDrafts[record.id] || ""}
                        onChange={(event) =>
                          setPaymentDrafts((current) => ({
                            ...current,
                            [record.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="primary-button due-action-button"
                        onClick={() => handleRecordPayment(record)}
                        disabled={activePaymentId === record.id}
                      >
                        <CheckIcon />
                        <span>
                          {activePaymentId === record.id
                            ? "Saving..."
                            : `${getPaymentButtonLabel(record.direction)} payment`}
                        </span>
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="due-side-panel">
          <section className="due-side-card">
            <div className="due-side-head">
              <span className="due-side-icon">
                <PlusIcon />
              </span>
              <div>
                <h3>Add due entry</h3>
                <p>Create manual receivable or payable records for anything outside sales or purchases.</p>
              </div>
            </div>

            <form className="due-form" onSubmit={handleCreateEntry}>
              <div className="purchase-grid purchase-grid-two">
                <label className="purchase-field-stack">
                  <span>Flow</span>
                  <select
                    className="purchase-input due-select"
                    value={form.direction}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, direction: event.target.value }))
                    }
                  >
                    <option value="receivable">Receivable</option>
                    <option value="payable">Payable</option>
                  </select>
                </label>

                <label className="purchase-field-stack">
                  <span>Category</span>
                  <input
                    className="purchase-input"
                    type="text"
                    placeholder="Service, rent, custom work"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="purchase-field-stack">
                <span>Party name</span>
                <input
                  className="purchase-input"
                  type="text"
                  placeholder="Customer, supplier, landlord"
                  value={form.partyName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, partyName: event.target.value }))
                  }
                />
              </label>

              <label className="purchase-field-stack">
                <span>Reference</span>
                <input
                  className="purchase-input"
                  type="text"
                  placeholder="Invoice no, project, item name"
                  value={form.reference}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, reference: event.target.value }))
                  }
                />
              </label>

              <div className="purchase-grid purchase-grid-two">
                <label className="purchase-field-stack">
                  <span>Total amount</span>
                  <input
                    className="purchase-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.totalAmount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, totalAmount: event.target.value }))
                    }
                  />
                </label>

                <label className="purchase-field-stack">
                  <span>Already paid</span>
                  <input
                    className="purchase-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.paidAmount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, paidAmount: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="purchase-field-stack">
                <span>Due date</span>
                <div className="date-input due-date-input">
                  <CalendarIcon />
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, dueDate: event.target.value }))
                    }
                  />
                </div>
              </div>

              <label className="purchase-field-stack">
                <span>Note</span>
                <textarea
                  className="purchase-textarea due-textarea"
                  placeholder="Add context for follow-up or settlement"
                  value={form.note}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, note: event.target.value }))
                  }
                />
              </label>

              <button type="submit" className="primary-button due-submit-button" disabled={isSubmitting}>
                <PlusIcon />
                <span>{isSubmitting ? "Saving entry..." : "Save due entry"}</span>
              </button>
            </form>
          </section>

          <section className="due-side-card due-side-card-focus">
            <div className="due-side-head">
              <span className="due-side-icon due-side-icon-alert">
                <AlertTriangleIcon />
              </span>
              <div>
                <h3>Priority follow-up</h3>
                <p>Highest-priority open records that need collection or payment attention.</p>
              </div>
            </div>

            <div className="due-focus-list">
              {focusItems.length ? (
                focusItems.map((record) => (
                  <article key={`focus-${record.sourceType}-${record.id}`} className="due-focus-item">
                    <div className="due-focus-copy">
                      <strong>{record.partyName}</strong>
                      <p>{record.reference || record.sourceLabel}</p>
                    </div>
                    <div className="due-focus-meta">
                      <span className={`due-status due-status-${record.status}`}>{record.status}</span>
                      <strong>{formatCurrency(record.dueAmount)}</strong>
                    </div>
                  </article>
                ))
              ) : (
                <div className="sales-empty-state due-empty-state">
                  <div className="sales-empty-icon">
                    <CheckIcon />
                  </div>
                  <h3>Nothing urgent</h3>
                  <p>All current records are settled or outside the selected filters.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
