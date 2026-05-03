"use client";

import { useEffect, useMemo, useState } from "react";
import AlertTriangleIcon from "@/components/svgs/AlertTriangleIcon";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import LedgerIcon from "@/components/svgs/LedgerIcon";
import PlusIcon from "@/components/svgs/PlusIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import { formatListDate } from "@/lib/dateFormat";

const STORAGE_KEY = "expense-tracker-warranty-manual-records";
const DEFAULT_WARRANTY_MONTHS = 12;
const EMPTY_FORM = {
  customerName: "",
  productName: "",
  invoiceNo: "",
  purchaseDate: "",
  warrantyMonths: "12",
  note: "",
};

function getEndDate(startDate, warrantyMonths) {
  if (Number(warrantyMonths || 0) <= 0) {
    return null;
  }

  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const endDate = new Date(parsed);
  endDate.setMonth(endDate.getMonth() + Number(warrantyMonths || DEFAULT_WARRANTY_MONTHS));
  return endDate;
}

function getWarrantyStatus(endDate) {
  if (!endDate) {
    return "unknown";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(endDate);
  normalizedEnd.setHours(0, 0, 0, 0);
  const dayDiff = Math.ceil((normalizedEnd.getTime() - today.getTime()) / 86400000);

  if (dayDiff < 0) {
    return "expired";
  }

  if (dayDiff <= 30) {
    return "expiring";
  }

  return "active";
}

function getStatusCount(records, status) {
  return records.filter((record) => record.status === status).length;
}

function getDurationLabel(months) {
  const value = Number(months || 0);
  return value > 0 ? `${value} months` : "No warranty";
}

function getStatusTone(status) {
  if (status === "active") {
    return "settled";
  }

  if (status === "expiring") {
    return "overdue";
  }

  return "open";
}

function getStatusLabel(status) {
  if (status === "expiring") {
    return "Expiring soon";
  }

  if (status === "expired") {
    return "Expired";
  }

  if (status === "active") {
    return "Active";
  }

  return "Unknown";
}

function getDaysRemaining(endDate) {
  if (!endDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedEnd = new Date(endDate);
  normalizedEnd.setHours(0, 0, 0, 0);
  return Math.ceil((normalizedEnd.getTime() - today.getTime()) / 86400000);
}

function getCoverageNote(record) {
  const remainingDays = getDaysRemaining(record.warrantyEndDate);

  if (remainingDays === null) {
    return "Warranty duration is not available for this record.";
  }

  if (remainingDays < 0) {
    return `Expired ${Math.abs(remainingDays)} days ago`;
  }

  if (remainingDays === 0) {
    return "Coverage ends today";
  }

  if (remainingDays <= 30) {
    return `${remainingDays} days left before warranty expiry`;
  }

  return `${remainingDays} days of warranty remaining`;
}

function buildSaleWarranties(sales) {
  const grouped = sales.reduce((summary, sale) => {
    const key = `${sale.invoiceNo || "manual"}::${sale.productName || "product"}`;

    if (!summary[key]) {
      const startDate = sale.createdAt;
      const warrantyMonths = Math.max(Number(sale.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS) || 0, 0);
      const endDate = getEndDate(startDate, warrantyMonths);

      summary[key] = {
        id: key,
        source: "sales",
        customerName: sale.customerName || "Walk-in customer",
        customerAddress: sale.customerAddress || "",
        customerPhone: sale.customerPhone || "",
        productName: sale.productName || "Unnamed product",
        invoiceNo: sale.invoiceNo || "-",
        purchaseDate: startDate,
        warrantyMonths,
        warrantyEndDate: endDate,
        status: getWarrantyStatus(endDate),
        note: sale.note || "",
        saleIds: [sale.id],
      };
    } else if (sale.id) {
      summary[key].saleIds.push(sale.id);
    }

    return summary;
  }, {});

  return Object.values(grouped);
}

function loadManualWarranties() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveManualWarranties(records) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export default function WarrantyManagementPage() {
  const [sales, setSales] = useState([]);
  const [manualRecords, setManualRecords] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingContext, setEditingContext] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditMode = Boolean(editingContext);
  const isSalesEdit = editingContext?.source === "sales";
  const isManualEdit = editingContext?.source === "manual";

  async function loadWarrantyData() {
    try {
      setErrorMessage("");
      const response = await fetch("/api/sales", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load warranty records.");
      }

      setSales(result.sales || []);
      setManualRecords(loadManualWarranties());
    } catch (error) {
      setErrorMessage(error.message || "Failed to load warranty records.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWarrantyData();
  }, []);

  const records = useMemo(() => {
    const autoRecords = buildSaleWarranties(sales);
    const normalizedManualRecords = manualRecords.map((record) => {
      const endDate = getEndDate(record.purchaseDate, record.warrantyMonths);
      return {
        ...record,
        source: "manual",
        warrantyEndDate: endDate,
        status: getWarrantyStatus(endDate),
      };
    });

    return [...normalizedManualRecords, ...autoRecords].sort((left, right) => {
      const leftTime = new Date(left.purchaseDate || 0).getTime();
      const rightTime = new Date(right.purchaseDate || 0).getTime();
      return leftTime - rightTime;
    });
  }, [manualRecords, sales]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        [record.customerName, record.customerAddress, record.customerPhone, record.productName, record.note]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter !== "all" && record.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [records, searchTerm, statusFilter]);

  const activeCount = getStatusCount(records, "active");
  const expiringCount = getStatusCount(records, "expiring");
  const expiredCount = getStatusCount(records, "expired");
  const manualCount = records.filter((record) => record.source === "manual").length;
  const coverageRate = records.length ? Math.round((activeCount / records.length) * 100) : 0;

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setEditingContext(null);
    setErrorMessage("");
    setSuccessMessage("");
    setIsFormModalOpen(true);
  }

  function closeFormModal() {
    setForm(EMPTY_FORM);
    setEditingContext(null);
    setIsFormModalOpen(false);
  }

  function handleLoadToForm(record) {
    if (!record) {
      return;
    }

    const isManualRecord = record.source === "manual";

    setForm({
      customerName: record.customerName || "",
      productName: record.productName || "",
      invoiceNo: record.invoiceNo === "-" ? "" : record.invoiceNo,
      purchaseDate: record.purchaseDate ? new Date(record.purchaseDate).toISOString().slice(0, 10) : "",
      warrantyMonths: String(record.warrantyMonths || 0),
      note: record.note || "",
    });
    setEditingContext(
      isManualRecord
        ? { id: record.id, source: "manual" }
        : { id: record.id, source: "sales", saleIds: record.saleIds || [] }
    );
    setErrorMessage("");
    setSuccessMessage(`Loaded ${record.productName} for update.`);
    setIsFormModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!form.customerName || !form.productName || !form.purchaseDate) {
        throw new Error("Customer, product, and purchase date are required.");
      }

      const nextRecord = {
        id: editingContext?.id || `manual-${Date.now()}`,
        customerName: form.customerName.trim(),
        productName: form.productName.trim(),
        invoiceNo: form.invoiceNo.trim() || "Manual",
        purchaseDate: form.purchaseDate,
        warrantyMonths: Number(form.warrantyMonths || DEFAULT_WARRANTY_MONTHS),
        note: form.note.trim(),
      };

      if (isSalesEdit) {
        const response = await fetch("/api/sales/warranty", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saleIds: editingContext.saleIds || [],
            customerName: nextRecord.customerName,
            productName: nextRecord.productName,
            invoiceNo: nextRecord.invoiceNo,
            purchaseDate: nextRecord.purchaseDate,
            warrantyMonths: nextRecord.warrantyMonths,
            note: nextRecord.note,
          }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update warranty record.");
        }

        await loadWarrantyData();
      } else {
        if (isManualEdit && !manualRecords.some((record) => record.id === editingContext.id)) {
          throw new Error("The selected manual warranty record could not be found. Reload it before updating.");
        }

        const nextRecords = isManualEdit
          ? manualRecords.map((record) => (record.id === editingContext.id ? nextRecord : record))
          : [nextRecord, ...manualRecords];

        setManualRecords(nextRecords);
        saveManualWarranties(nextRecords);
      }

      setSuccessMessage(isEditMode ? "Warranty record updated." : "Warranty record added.");
      closeFormModal();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save warranty record.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopyInvoice(invoiceNo) {
    if (!invoiceNo || invoiceNo === "-") {
      setErrorMessage("No invoice number available for this warranty record.");
      return;
    }

    try {
      await navigator.clipboard.writeText(invoiceNo);
      setErrorMessage("");
      setSuccessMessage(`Invoice ${invoiceNo} copied.`);
    } catch {
      setErrorMessage("Failed to copy invoice number.");
    }
  }

  function handleDeleteRecord(record) {
    if (!record) {
      return;
    }

    if (record.source !== "manual") {
      setErrorMessage("Only manual warranty records can be deleted from this page.");
      return;
    }

    if (!window.confirm(`Delete manual warranty record for ${record.productName}?`)) {
      return;
    }

    const nextRecords = manualRecords.filter((entry) => entry.id !== record.id);
    setManualRecords(nextRecords);
    saveManualWarranties(nextRecords);

    if (editingContext?.source === "manual" && editingContext.id === record.id) {
      closeFormModal();
    }

    setErrorMessage("");
    setSuccessMessage("Warranty record deleted.");
  }

  return (
    <>
      <section className="content-area warranty-page warranty-page-pro">
        <div className="warranty-pro-hero">
          <div className="warranty-pro-hero-copy">
            <span className="warranty-pro-eyebrow">Warranty Operations</span>
            <h2>Warranty management</h2>
            <p>
              Monitor live coverage, review expiring cases, and register manual warranty records
              from one operational workspace.
            </p>
          </div>

          <div className="warranty-pro-hero-actions">
            <div className="warranty-pro-highlight-card">
              <span>Coverage health</span>
              <strong>{coverageRate}% active</strong>
              <p>{records.length || 0} total warranty records across sales and manual entries</p>
            </div>

            <button
              type="button"
              className="pill-button warranty-pro-refresh"
              onClick={() => {
                setIsLoading(true);
                loadWarrantyData();
              }}
            >
              <RefreshIcon />
              <span>Refresh warranty desk</span>
            </button>
          </div>
        </div>

        <div className="warranty-pro-summary-grid">
          <article className="warranty-pro-summary-card warranty-pro-summary-card-green">
            <span className="warranty-pro-summary-icon"><CheckIcon /></span>
            <div className="warranty-pro-summary-copy">
              <div className="warranty-pro-summary-headline">
                <span>Active coverage</span>
                <strong className="warranty-pro-summary-metric">{activeCount}</strong>
              </div>
              <p>Warranties still fully covered with more than 30 days remaining</p>
            </div>
          </article>

          <article className="warranty-pro-summary-card warranty-pro-summary-card-amber">
            <span className="warranty-pro-summary-icon"><AlertTriangleIcon /></span>
            <div className="warranty-pro-summary-copy">
              <div className="warranty-pro-summary-headline">
                <span>Expiring soon</span>
                <strong className="warranty-pro-summary-metric">{expiringCount}</strong>
              </div>
              <p>Records that need customer follow-up before the warranty window closes</p>
            </div>
          </article>

          <article className="warranty-pro-summary-card warranty-pro-summary-card-slate">
            <span className="warranty-pro-summary-icon"><LedgerIcon /></span>
            <div className="warranty-pro-summary-copy">
              <div className="warranty-pro-summary-headline">
                <span>Expired records</span>
                <strong className="warranty-pro-summary-metric">{expiredCount}</strong>
              </div>
              <p>Completed coverage histories still available for service reference</p>
            </div>
          </article>

          <article className="warranty-pro-summary-card warranty-pro-summary-card-blue">
            <span className="warranty-pro-summary-icon"><PlusIcon /></span>
            <div className="warranty-pro-summary-copy">
              <div className="warranty-pro-summary-headline">
                <span>Manual entries</span>
                <strong className="warranty-pro-summary-metric">{manualCount}</strong>
              </div>
              <p>Offline, service-desk, and custom records added outside sales checkout</p>
            </div>
          </article>
        </div>

        {successMessage ? <p className="admin-feedback admin-feedback-success">{successMessage}</p> : null}
        {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

        <div className="warranty-pro-layout">
          <div className="warranty-pro-main">
            <section className="warranty-pro-panel warranty-pro-records-panel">
              <div className="warranty-pro-panel-head">
                <div>
                  <span className="warranty-pro-panel-label">Warranty register</span>
                </div>
                <strong>{filteredRecords.length} visible</strong>
              </div>

              <div className="warranty-pro-toolbar">
                <label className="search-field warranty-pro-search-field">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search customer, phone, address, product, or note"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </label>

                <select
                  className="purchase-input warranty-pro-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="expiring">Expiring soon</option>
                  <option value="expired">Expired</option>
                  <option value="unknown">Unknown</option>
                </select>

                <button type="button" className="primary-button warranty-pro-add-button" onClick={openCreateModal}>
                  <PlusIcon />
                  <span>Manual entry</span>
                </button>
              </div>

              <div className="warranty-pro-table-shell clean-table-card">
                {isLoading ? (
                  <div className="table-empty">Loading warranty records...</div>
                ) : filteredRecords.length ? (
                  <div className="clean-table-scroll">
                    <table className="clean-data-table warranty-clean-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Phone</th>
                          <th>Address</th>
                          <th>Product</th>
                          <th>Purchase date</th>
                          <th>Coverage</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="clean-stack-cell clean-text-cell">
                              <strong>{record.customerName}</strong>
                              <span>{record.note || "No note added"}</span>
                            </td>
                            <td className="clean-stack-cell clean-text-cell">
                              <strong>{record.customerPhone || "-"}</strong>
                              <span>Customer phone</span>
                            </td>
                            <td className="clean-stack-cell clean-text-cell">
                              <strong>{record.customerAddress || "-"}</strong>
                              <span>Customer address</span>
                            </td>
                            <td className="clean-stack-cell clean-text-cell">
                              <strong>{record.productName}</strong>
                              <span>{record.source === "sales" ? "Sales record" : "Manual record"}</span>
                            </td>
                            <td>{formatListDate(record.purchaseDate)}</td>
                            <td className="clean-stack-cell clean-text-cell">
                              <strong>{getDurationLabel(record.warrantyMonths)}</strong>
                              <span>{getCoverageNote(record)}</span>
                            </td>
                            <td className="clean-center-cell">
                              <span className={`due-status due-status-${getStatusTone(record.status)}`}>
                                {getStatusLabel(record.status)}
                              </span>
                            </td>
                            <td>
                              <div className="clean-action-cell">
                                <button type="button" className="outline-button warranty-pro-list-action" onClick={() => handleLoadToForm(record)}>
                                  Edit
                                </button>
                                {record.source === "manual" ? (
                                  <button
                                    type="button"
                                    className="outline-button warranty-pro-list-action warranty-pro-list-action-danger"
                                    onClick={() => handleDeleteRecord(record)}
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="table-empty">No warranty records match the current filters.</div>
                )}
              </div>

              {!isLoading && filteredRecords.length ? (
                <div className="warranty-pro-mobile-grid">
                  {filteredRecords.map((record) => (
                    <article key={`mobile-${record.id}`} className="warranty-pro-mobile-card warranty-pro-mobile-card-actions">
                      <div className="warranty-pro-mobile-head">
                        <div>
                          <strong>{record.customerName}</strong>
                          <p>{record.productName}</p>
                        </div>
                        <span className={`due-status due-status-${getStatusTone(record.status)}`}>
                          {getStatusLabel(record.status)}
                        </span>
                      </div>
                      <div className="warranty-pro-mobile-grid-inner">
                        <div><span>Phone</span><strong>{record.customerPhone || "-"}</strong></div>
                        <div><span>Address</span><strong>{record.customerAddress || "-"}</strong></div>
                        <div><span>Purchase</span><strong>{formatListDate(record.purchaseDate)}</strong></div>
                        <div><span>Coverage</span><strong>{getDurationLabel(record.warrantyMonths)}</strong></div>
                        <div><span>Note</span><strong>{record.note || "No note added"}</strong></div>
                      </div>
                      <div className="warranty-pro-mobile-actions">
                        <button type="button" className="outline-button warranty-pro-list-action" onClick={() => handleLoadToForm(record)}>
                          Edit
                        </button>
                        {record.source === "manual" ? (
                          <button
                            type="button"
                            className="outline-button warranty-pro-list-action warranty-pro-list-action-danger"
                            onClick={() => handleDeleteRecord(record)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          
        </div>
      </section>

      {isFormModalOpen ? (
        <div className="route-modal-overlay" onClick={closeFormModal}>
          <div className="route-modal-shell warranty-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header warranty-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="warranty-pro-panel-label">Manual entry</span>
                    <h1>{isEditMode ? "Update warranty record" : "Add warranty record"}</h1>
                    <p>
                      {isEditMode
                        ? isSalesEdit
                          ? "You are editing a sales-linked warranty record."
                          : "You are editing an existing manual warranty record."
                        : "Create coverage records for offline sales, repair cases, or custom service jobs."}
                    </p>
                  </div>
                </div>
                <button type="button" className="outline-button warranty-modal-close" onClick={closeFormModal}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <form className="warranty-form warranty-pro-form" onSubmit={handleSubmit}>
                    <label className="purchase-field-stack">
                      <span>Customer name</span>
                      <input
                        className="purchase-input"
                        type="text"
                        placeholder="Customer full name"
                        value={form.customerName}
                        onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
                      />
                    </label>

                    <label className="purchase-field-stack">
                      <span>Product name</span>
                      <input
                        className="purchase-input"
                        type="text"
                        placeholder="Product or device model"
                        value={form.productName}
                        onChange={(event) => setForm((current) => ({ ...current, productName: event.target.value }))}
                      />
                    </label>

                    <label className="purchase-field-stack">
                      <span>Invoice no</span>
                      <input
                        className="purchase-input"
                        type="text"
                        placeholder="Invoice or service receipt"
                        value={form.invoiceNo}
                        onChange={(event) => setForm((current) => ({ ...current, invoiceNo: event.target.value }))}
                      />
                    </label>

                    <div className="purchase-grid purchase-grid-two">
                      <div className="purchase-field-stack">
                        <span>Purchase date</span>
                        <div className="date-input warranty-date-input">
                          <CalendarIcon />
                          <input
                            type="date"
                            value={form.purchaseDate}
                            onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))}
                          />
                        </div>
                      </div>

                      <label className="purchase-field-stack">
                        <span>Warranty months</span>
                        <input
                          className="purchase-input"
                          type="number"
                          min="0"
                          placeholder="12"
                          value={form.warrantyMonths}
                          onChange={(event) => setForm((current) => ({ ...current, warrantyMonths: event.target.value }))}
                        />
                      </label>
                    </div>

                    <label className="purchase-field-stack">
                      <span>Note</span>
                      <textarea
                        className="purchase-textarea warranty-textarea"
                        placeholder="Service note, terms, or customer instruction"
                        value={form.note}
                        onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                      />
                    </label>

                    <div className="warranty-pro-action-row">
                      <button type="submit" className="primary-button warranty-submit-button" disabled={isSaving}>
                        <PlusIcon />
                        <span>
                          {isSaving
                            ? isEditMode
                              ? "Updating warranty..."
                              : "Saving warranty..."
                            : isEditMode
                              ? "Update warranty record"
                              : "Save warranty record"}
                        </span>
                      </button>
                      <button type="button" className="outline-button warranty-action-button" onClick={closeFormModal}>
                        <span>{isEditMode ? "Cancel edit" : "Close"}</span>
                      </button>
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
