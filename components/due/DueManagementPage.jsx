"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AlertTriangleIcon from "@/components/svgs/AlertTriangleIcon";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import PlusIcon from "@/components/svgs/PlusIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import TakaIcon from "@/components/svgs/TakaIcon";
import { formatListDate, formatListDateTime } from "@/lib/dateFormat";

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

const DEFAULT_PAYMENT_ACCOUNT = "Cash";

function formatCurrency(value) {
  return `Tk ${Number(value || 0).toFixed(0)}`;
}

function formatSaleDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const partMap = parts.reduce((summary, part) => {
    if (part.type !== "literal") {
      summary[part.type] = part.value;
    }

    return summary;
  }, {});

  return `${partMap.day} ${String(partMap.month || "").toLowerCase()} ${partMap.year}`;
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

function getRecordEntryTime(record) {
  const createdAt = new Date(record.createdAt).getTime();
  const dueDate = new Date(record.dueDate).getTime();

  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  return Number.isFinite(dueDate) ? dueDate : 0;
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

function getRecordDomKey(record) {
  return `${record.sourceType}-${record.id}`;
}

export default function DueManagementPage() {
  const [records, setRecords] = useState([]);
  const [paymentAccounts, setPaymentAccounts] = useState([{ id: "cash", name: DEFAULT_PAYMENT_ACCOUNT }]);
  const [summary, setSummary] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    overdueAmount: 0,
    overdueCount: 0,
    openCount: 0,
    settledCount: 0,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccount, setPaymentAccount] = useState(DEFAULT_PAYMENT_ACCOUNT);
  const [activePaymentId, setActivePaymentId] = useState("");
  const [highlightedRecordKey, setHighlightedRecordKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const highlightTimerRef = useRef(null);

  async function loadDueData() {
    try {
      setErrorMessage("");
      const [dueResponse, masterDataResponse] = await Promise.all([
        fetch("/api/due-management", { cache: "no-store" }),
        fetch("/api/master-data", { cache: "no-store" }),
      ]);
      const [result, masterDataResult] = await Promise.all([
        dueResponse.json(),
        masterDataResponse.json(),
      ]);

      if (!dueResponse.ok) {
        throw new Error(result.error || "Failed to load due records.");
      }

      if (!masterDataResponse.ok) {
        throw new Error(masterDataResult.error || "Failed to load payment accounts.");
      }

      const bankOptions = Array.isArray(masterDataResult.items?.bank) ? masterDataResult.items.bank : [];
      const dedupedAccounts = [
        { id: "cash", name: DEFAULT_PAYMENT_ACCOUNT },
        ...bankOptions.filter(
          (option, index, collection) =>
            collection.findIndex(
              (entry) => String(entry.name || "").trim().toLowerCase() === String(option.name || "").trim().toLowerCase(),
            ) === index,
        ),
      ];

      setRecords(result.records || []);
      setSummary(result.summary || {});
      setPaymentAccounts(dedupedAccounts);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load due records.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDueData();

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...records]
      .filter((record) => {
        if (record.status === "settled") {
          return false;
        }

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

        if (directionFilter !== "all" && record.direction !== directionFilter) {
          return false;
        }

        if (sourceFilter !== "all" && record.sourceType !== sourceFilter) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        const timeDelta = getRecordEntryTime(left) - getRecordEntryTime(right);
        if (timeDelta !== 0) {
          return timeDelta;
        }

        return normalizeStatusPriority(left.status) - normalizeStatusPriority(right.status);
      });
  }, [directionFilter, records, searchTerm, sourceFilter]);

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
      setIsEntryModalOpen(false);
      setSuccessMessage("Manual due entry saved.");
      await loadDueData();
    } catch (error) {
      setErrorMessage(error.message || "Failed to create due entry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEntryModal() {
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setSuccessMessage("");
    setIsEntryModalOpen(true);
  }

  function closeEntryModal() {
    if (isSubmitting) {
      return;
    }

    setIsEntryModalOpen(false);
  }

  function openHistoryModal(record) {
    setHistoryRecord(record);
  }

  function closeHistoryModal() {
    setHistoryRecord(null);
  }

  function openPaymentModal(record) {
    setPaymentRecord(record);
    setPaymentAmount("");
    setPaymentAccount(DEFAULT_PAYMENT_ACCOUNT);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closePaymentModal() {
    if (activePaymentId) {
      return;
    }

    setPaymentRecord(null);
    setPaymentAmount("");
    setPaymentAccount(DEFAULT_PAYMENT_ACCOUNT);
  }

  function handleFocusRecord(record) {
    const recordKey = getRecordDomKey(record);
    setHighlightedRecordKey(recordKey);

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }

    window.requestAnimationFrame(() => {
      const targets = Array.from(document.querySelectorAll(`[data-due-record-key="${recordKey}"]`));
      const target = targets.find((element) => element.getClientRects().length) || targets[0];
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });

    highlightTimerRef.current = setTimeout(() => {
      setHighlightedRecordKey("");
    }, 2600);
  }

  async function handleRecordPayment() {
    const draftAmount = Number(paymentAmount || 0);
    const record = paymentRecord;

    if (!record || !draftAmount || draftAmount <= 0 || activePaymentId) {
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
          paymentAccount,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to record payment.");
      }

      setSuccessMessage(`${getPaymentButtonLabel(record.direction)} payment recorded in ${paymentAccount}.`);
      closePaymentModal();
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
          <button type="button" className="primary-button due-add-button" onClick={openEntryModal}>
            <PlusIcon />
            <span>Add due entry</span>
          </button>
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

      <div className="stats-grid due-summary-grid">
        <article className="stat-card stat-green">
          <span className="stat-icon">
            <TakaIcon />
          </span>
          <div>
            <p>Total receivable</p>
            <strong>{formatCurrency(summary.totalReceivable)}</strong>
          </div>
        </article>

        <article className="stat-card stat-rose">
          <span className="stat-icon">
            <MoneyIcon />
          </span>
          <div>
            <p>Total payable</p>
            <strong>{formatCurrency(summary.totalPayable)}</strong>
          </div>
        </article>

        <article className="stat-card stat-amber">
          <span className="stat-icon">
            <AlertTriangleIcon />
          </span>
          <div>
            <p>Overdue exposure</p>
            <strong>{formatCurrency(summary.overdueAmount)}</strong>
          </div>
        </article>

        <article className="stat-card stat-sky">
          <span className="stat-icon">
            <ReceiptIcon />
          </span>
          <div>
            <p>Open records</p>
            <strong>{summary.openCount || 0}</strong>
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
              <span>Phone</span>
              <span>Address</span>
              <span>Source</span>
              <span>Reference</span>
              <span>Sale date</span>
              <span>Due date</span>
              <span>Total</span>
              <span>Paid</span>
              <span>Balance</span>
              <span>Action</span>
            </div>

            {isLoading ? (
              <div className="table-empty">Loading due records...</div>
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => {
                const recordKey = getRecordDomKey(record);

                return (
                <div
                  key={recordKey}
                  className={`due-table-row${highlightedRecordKey === recordKey ? " due-record-highlight" : ""}`}
                  data-due-record-key={recordKey}
                >
                  <div className="due-party-block">
                    <strong>{record.partyName}</strong>
                    <p>{getMetaLine(record)}</p>
                  </div>
                  <span>{record.meta?.customerPhone || "-"}</span>
                  <span>{record.meta?.customerAddress || "-"}</span>
                  <span className="due-pill-cell">
                    <span className={`due-pill due-pill-${record.direction}`}>
                      {record.sourceLabel}
                    </span>
                  </span>
                  <span>{record.reference || "-"}</span>
                  <span>{formatSaleDate(record.createdAt)}</span>
                  <span>{formatListDate(record.dueDate || record.createdAt)}</span>
                  <span>{formatCurrency(record.totalAmount)}</span>
                  <span>{formatCurrency(record.paidAmount)}</span>
                  <strong className="due-balance-cell">{formatCurrency(record.dueAmount)}</strong>
                  <div className="due-action-cell">
                    <button
                      type="button"
                      className="outline-button due-history-button"
                      onClick={() => openHistoryModal(record)}
                      >
                        History
                      </button>
                    {record.dueAmount > 0 ? (
                      <>
                        <button
                          type="button"
                          className="primary-button due-action-button"
                          onClick={() => openPaymentModal(record)}
                          disabled={activePaymentId === record.id}
                        >
                          <CheckIcon />
                          <span>
                            {activePaymentId === record.id ? "Saving..." : getPaymentButtonLabel(record.direction)}
                          </span>
                        </button>
                      </>
                    ) : (
                      <span className="due-settled-text">Settled</span>
                    )}
                  </div>
                </div>
                );
              })
            ) : (
              <div className="table-empty">No due records match the current filters.</div>
            )}
          </div>

          {!isLoading && filteredRecords.length ? (
            <div className="due-mobile-grid">
              {filteredRecords.map((record) => {
                const recordKey = getRecordDomKey(record);

                return (
                <article
                  key={`mobile-${recordKey}`}
                  className={`due-mobile-card${highlightedRecordKey === recordKey ? " due-record-highlight" : ""}`}
                  data-due-record-key={recordKey}
                >
                  <div className="due-mobile-head">
                    <div>
                      <strong>{record.partyName}</strong>
                      <p>{record.sourceLabel}</p>
                    </div>
                  </div>

                  <div className="due-mobile-details">
                    <div>
                      <span>Phone</span>
                      <strong>{record.meta?.customerPhone || "-"}</strong>
                    </div>
                    <div>
                      <span>Address</span>
                      <strong>{record.meta?.customerAddress || "-"}</strong>
                    </div>
                    <div>
                      <span>Reference</span>
                      <strong>{record.reference || "-"}</strong>
                    </div>
                    <div>
                      <span>Sale date</span>
                      <strong>{formatSaleDate(record.createdAt)}</strong>
                    </div>
                    <div>
                      <span>Due date</span>
                      <strong>{formatListDate(record.dueDate || record.createdAt)}</strong>
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
                      <button
                        type="button"
                        className="outline-button due-history-button"
                        onClick={() => openHistoryModal(record)}
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className="primary-button due-action-button"
                        onClick={() => openPaymentModal(record)}
                        disabled={activePaymentId === record.id}
                      >
                        <CheckIcon />
                        <span>
                          {activePaymentId === record.id
                            ? "Saving..."
                            : getPaymentButtonLabel(record.direction)}
                        </span>
                      </button>
                    </div>
                  ) : null}
                  {record.dueAmount <= 0 ? (
                    <div className="due-mobile-action">
                      <button
                        type="button"
                        className="outline-button due-history-button"
                        onClick={() => openHistoryModal(record)}
                      >
                        History
                      </button>
                    </div>
                  ) : null}
                </article>
                );
              })}
            </div>
          ) : null}
        </div>

        <aside className="due-side-panel">
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
                focusItems.map((record) => {
                  const recordKey = getRecordDomKey(record);

                  return (
                  <button
                    key={`focus-${recordKey}`}
                    type="button"
                    className={`due-focus-item${highlightedRecordKey === recordKey ? " due-focus-item-active" : ""}`}
                    onClick={() => handleFocusRecord(record)}
                  >
                    <div className="due-focus-copy">
                      <strong>{record.partyName}</strong>
                      <p>{record.reference || record.sourceLabel}</p>
                    </div>
                    <div className="due-focus-meta">
                      <span className={`due-status due-status-${record.status}`}>{record.status}</span>
                      <strong>{formatCurrency(record.dueAmount)}</strong>
                    </div>
                  </button>
                  );
                })
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

      {isEntryModalOpen ? (
        <div className="route-modal-overlay" onClick={closeEntryModal}>
          <div className="route-modal-shell customer-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header customer-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="customer-pro-panel-label">Due entry</span>
                    <h1>Add due entry</h1>
                    <p>Create a manual receivable or payable record outside sales or purchases.</p>
                  </div>
                </div>
                <button type="button" className="outline-button warranty-modal-close" onClick={closeEntryModal} disabled={isSubmitting}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
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
                          step="1"
                          placeholder="0"
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
                          step="1"
                          placeholder="0"
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

                    <div className="customer-pro-action-row">
                      <button type="submit" className="primary-button due-submit-button" disabled={isSubmitting}>
                        <PlusIcon />
                        <span>{isSubmitting ? "Saving entry..." : "Save due entry"}</span>
                      </button>
                      <button type="button" className="outline-button" onClick={closeEntryModal} disabled={isSubmitting}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {paymentRecord ? (
        <div className="route-modal-overlay" onClick={closePaymentModal}>
          <div className="route-modal-shell customer-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header customer-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="customer-pro-panel-label">{getPaymentButtonLabel(paymentRecord.direction)}</span>
                    <h1>{paymentRecord.partyName}</h1>
                    <p>{paymentRecord.reference || paymentRecord.sourceLabel}</p>
                  </div>
                </div>
                <button type="button" className="outline-button warranty-modal-close" onClick={closePaymentModal} disabled={Boolean(activePaymentId)}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <div className="due-history-stack">
                    <div className="due-history-item">
                      <div className="due-history-copy">
                        <strong>Balance</strong>
                        <p>{formatCurrency(paymentRecord.dueAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <form
                    className="due-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleRecordPayment();
                    }}
                  >
                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Amount</span>
                        <input
                          className="purchase-input due-payment-input"
                          type="number"
                          min="0"
                          max={paymentRecord.dueAmount}
                          step="1"
                          placeholder={paymentRecord.dueAmount.toFixed(0)}
                          value={paymentAmount}
                          onChange={(event) => setPaymentAmount(event.target.value)}
                          required
                        />
                      </label>

                      <label className="purchase-field-stack">
                        <span>{paymentRecord.direction === "receivable" ? "Receive to" : "Pay from"}</span>
                        <div className="purchase-select-wrap due-select-wrap">
                          <select
                            className="purchase-input purchase-select-input due-select"
                            value={paymentAccount}
                            onChange={(event) => setPaymentAccount(event.target.value)}
                          >
                            {paymentAccounts.map((account) => (
                              <option key={account.id || account.name} value={account.name}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          <span className="purchase-select-arrow" aria-hidden="true">
                            <svg viewBox="0 0 20 20">
                              <path d="m5 7 5 5 5-5" />
                            </svg>
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="customer-pro-action-row">
                      <button type="submit" className="primary-button due-action-button" disabled={Boolean(activePaymentId)}>
                        <CheckIcon />
                        <span>{activePaymentId ? "Saving..." : getPaymentButtonLabel(paymentRecord.direction)}</span>
                      </button>
                      <button type="button" className="outline-button" onClick={closePaymentModal} disabled={Boolean(activePaymentId)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {historyRecord ? (
        <div className="route-modal-overlay" onClick={closeHistoryModal}>
          <div className="route-modal-shell customer-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header customer-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="customer-pro-panel-label">Collection history</span>
                    <h1>{historyRecord.partyName}</h1>
                    <p>{historyRecord.reference || historyRecord.sourceLabel}</p>
                  </div>
                </div>
                <button type="button" className="outline-button warranty-modal-close" onClick={closeHistoryModal}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <div className="due-history-stack">
                    {historyRecord.paymentHistory?.length ? (
                      historyRecord.paymentHistory.map((entry) => (
                        <article key={entry.id} className="due-history-item">
                          <div className="due-history-copy">
                            <strong>{formatCurrency(entry.amount)}</strong>
                            <p>{entry.note || "Recorded payment"}{entry.account ? ` | ${entry.account}` : ""}</p>
                          </div>
                          <span>{formatListDateTime(entry.createdAt)}</span>
                        </article>
                      ))
                    ) : (
                      <div className="table-empty">No collection history recorded yet.</div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
