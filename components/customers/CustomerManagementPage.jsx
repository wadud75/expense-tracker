"use client";

import { useEffect, useMemo, useState } from "react";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import CustomerIcon from "@/components/svgs/CustomerIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import PlusIcon from "@/components/svgs/PlusIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import SearchIcon from "@/components/svgs/SearchIcon";

const EMPTY_FORM = {
  id: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  segment: "retail",
  status: "active",
  notes: "",
};

function normalizeText(value) {
  return (value || "").trim().toLowerCase();
}

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

function buildSalesSummary(sales) {
  const summary = {};

  sales.forEach((sale) => {
    const key = normalizeText(sale.customerName);

    if (!key || key === "walk-in customer") {
      return;
    }

    if (!summary[key]) {
      summary[key] = {
        invoices: new Map(),
        units: 0,
        lastPurchaseAt: "",
      };
    }

    const bucket = summary[key];
    const invoiceKey = sale.invoiceNo || sale.id;

    if (!bucket.invoices.has(invoiceKey)) {
      const invoiceTotal = Number(sale.invoiceTotal ?? sale.lineTotal ?? 0);
      const paidAmount = Number(sale.paidAmount ?? invoiceTotal);

      bucket.invoices.set(invoiceKey, {
        invoiceTotal,
        paidAmount,
      });
    }

    bucket.units += Number(sale.quantity || 0);

    const currentTimestamp = new Date(sale.createdAt || 0).getTime();
    const previousTimestamp = new Date(bucket.lastPurchaseAt || 0).getTime();
    if (currentTimestamp > previousTimestamp) {
      bucket.lastPurchaseAt = sale.createdAt;
    }
  });

  return Object.fromEntries(
    Object.entries(summary).map(([key, value]) => {
      const invoices = Array.from(value.invoices.values());
      const orders = invoices.length;
      const revenue = invoices.reduce((total, invoice) => total + invoice.invoiceTotal, 0);
      const paid = invoices.reduce((total, invoice) => total + invoice.paidAmount, 0);

      return [
        key,
        {
          orders,
          revenue,
          paid,
          due: Math.max(revenue - paid, 0),
          units: value.units,
          lastPurchaseAt: value.lastPurchaseAt,
        },
      ];
    }),
  );
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    try {
      setErrorMessage("");
      const [customersResponse, salesResponse] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        fetch("/api/sales", { cache: "no-store" }),
      ]);

      const customersResult = await customersResponse.json();
      const salesResult = await salesResponse.json();

      if (!customersResponse.ok) {
        throw new Error(customersResult.error || "Failed to load customers.");
      }

      if (!salesResponse.ok) {
        throw new Error(salesResult.error || "Failed to load sales.");
      }

      setCustomers(customersResult.customers || []);
      setSales(salesResult.sales || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load customer workspace.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const salesSummaryByCustomer = useMemo(() => buildSalesSummary(sales), [sales]);

  const customerRecords = useMemo(
    () =>
      customers.map((customer) => {
        const summary = salesSummaryByCustomer[normalizeText(customer.name)] || {
          orders: 0,
          revenue: 0,
          paid: 0,
          due: 0,
          units: 0,
          lastPurchaseAt: "",
        };

        return {
          ...customer,
          ...summary,
        };
      }),
    [customers, salesSummaryByCustomer],
  );

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);

    return customerRecords.filter((customer) => {
      const matchesSearch =
        !normalizedSearch ||
        [customer.name, customer.phone, customer.email, customer.address, customer.notes, customer.segment, customer.status]
          .filter(Boolean)
          .some((value) => normalizeText(value).includes(normalizedSearch));

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter !== "all" && customer.status !== statusFilter) {
        return false;
      }

      if (segmentFilter !== "all" && customer.segment !== segmentFilter) {
        return false;
      }

      return true;
    });
  }, [customerRecords, searchTerm, statusFilter, segmentFilter]);

  const totalDue = filteredCustomers.reduce((total, customer) => total + customer.due, 0);
  const activeCustomers = filteredCustomers.filter((customer) => customer.status === "active").length;
  const repeatBuyers = filteredCustomers.filter((customer) => customer.orders > 1).length;

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setFeedback("");
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(customer) {
    setForm({
      id: customer.id,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      segment: customer.segment || "retail",
      status: customer.status || "active",
      notes: customer.notes || "",
    });
    setFeedback("");
    setErrorMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");
      setFeedback("");

      const isEditMode = Boolean(form.id);
      const response = await fetch("/api/customers", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save customer.");
      }

      if (isEditMode) {
        setCustomers((current) =>
          current.map((customer) => (customer.id === result.customer.id ? result.customer : customer)),
        );
        setFeedback("Customer updated.");
      } else {
        setCustomers((current) => [result.customer, ...current]);
        setFeedback("Customer added.");
      }

      closeModal();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save customer.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(customer) {
    if (!customer) {
      return;
    }

    if (!window.confirm(`Delete ${customer.name} from customer management?`)) {
      return;
    }

    try {
      setErrorMessage("");
      setFeedback("");

      const response = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete customer.");
      }

      setCustomers((current) => current.filter((entry) => entry.id !== customer.id));
      setFeedback("Customer deleted.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete customer.");
    }
  }

  return (
    <>
      <section className="content-area customer-page customer-page-pro">
        <div className="customer-pro-hero customer-pro-hero-clean">
          <div className="customer-pro-hero-copy">
            <span className="customer-pro-eyebrow">Customer Desk</span>
            <h2>Customer management</h2>
            <p>One place to manage customer records, relationship status, repeat buyers, and collection exposure.</p>
          </div>

          <div className="customer-pro-hero-actions customer-pro-hero-actions-simple">
            <button
              type="button"
              className="pill-button customer-pro-refresh"
              onClick={() => {
                setIsLoading(true);
                loadData();
              }}
            >
              <RefreshIcon />
              <span>Refresh</span>
            </button>
            <button type="button" className="primary-button customer-pro-add-button" onClick={openCreateModal}>
              <PlusIcon />
              <span>Add customer</span>
            </button>
          </div>
        </div>

        <div className="customer-pro-summary-grid customer-pro-summary-grid-compact">
          <article className="customer-pro-summary-card customer-pro-summary-card-blue">
            <span className="customer-pro-summary-icon"><CustomerIcon /></span>
            <div className="customer-pro-summary-copy">
              <span>Customers</span>
              <strong>{filteredCustomers.length}</strong>
              <p>Total visible profiles</p>
            </div>
          </article>
          <article className="customer-pro-summary-card customer-pro-summary-card-green">
            <span className="customer-pro-summary-icon"><CheckIcon /></span>
            <div className="customer-pro-summary-copy">
              <span>Active</span>
              <strong>{activeCustomers}</strong>
              <p>Ready for regular sales</p>
            </div>
          </article>
          <article className="customer-pro-summary-card customer-pro-summary-card-amber">
            <span className="customer-pro-summary-icon"><CalendarIcon /></span>
            <div className="customer-pro-summary-copy">
              <span>Repeat buyers</span>
              <strong>{repeatBuyers}</strong>
              <p>More than one invoice</p>
            </div>
          </article>
          <article className="customer-pro-summary-card customer-pro-summary-card-rose">
            <span className="customer-pro-summary-icon"><MoneyIcon /></span>
            <div className="customer-pro-summary-copy">
              <span>Outstanding due</span>
              <strong>{formatCurrency(totalDue)}</strong>
              <p>Open collection exposure</p>
            </div>
          </article>
        </div>

        {feedback ? <p className="admin-feedback admin-feedback-success">{feedback}</p> : null}
        {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

        <section className="customer-pro-panel customer-pro-register-panel">
          <div className="customer-pro-panel-head">
            <div>
              <span className="customer-pro-panel-label">Customer register</span>
              <h3>Professional customer directory</h3>
              <p>Search, segment, and update every customer record from a cleaner single workspace.</p>
            </div>
            <strong>{filteredCustomers.length} visible</strong>
          </div>

          <div className="customer-pro-toolbar customer-pro-toolbar-clean">
            <label className="search-field customer-pro-search-field">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search name, phone, email, address, note, or segment"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <select className="purchase-input customer-pro-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="follow-up">Follow-up</option>
              <option value="inactive">Inactive</option>
            </select>

            <select className="purchase-input customer-pro-select" value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value)}>
              <option value="all">All segments</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="corporate">Corporate</option>
              <option value="service">Service</option>
            </select>
          </div>

          <div className="customer-pro-table-shell customer-pro-table-shell-clean">
            <div className="customer-pro-table-head customer-pro-table-head-clean">
              <span>Customer</span>
              <span>Contact</span>
              <span>Segment</span>
              <span>Orders</span>
              <span>Revenue</span>
              <span>Due</span>
              <span>Actions</span>
            </div>

            {isLoading ? (
              <div className="table-empty">Loading customer workspace...</div>
            ) : filteredCustomers.length ? (
              <div className="customer-pro-table-body">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="customer-pro-row customer-pro-row-clean">
                    <span className="customer-pro-cell customer-pro-customer-cell">
                      <strong>{customer.name}</strong>
                      <small>{customer.notes || "No internal note added"}</small>
                    </span>
                    <span className="customer-pro-cell">
                      <strong>{customer.phone || "-"}</strong>
                      <small>{customer.email || "No email address"}</small>
                    </span>
                    <span className="customer-pro-cell">
                      <strong>{customer.segment}</strong>
                      <small>{customer.status}</small>
                    </span>
                    <span className="customer-pro-cell">
                      <strong>{customer.orders}</strong>
                      <small>Last purchase {formatDate(customer.lastPurchaseAt)}</small>
                    </span>
                    <span className="customer-pro-cell">
                      <strong>{formatCurrency(customer.revenue)}</strong>
                      <small>{customer.units} units sold</small>
                    </span>
                    <span className="customer-pro-cell">
                      <strong>{formatCurrency(customer.due)}</strong>
                      <small>{customer.status === "follow-up" ? "Needs attention" : "Collection status"}</small>
                    </span>
                    <div className="customer-pro-row-actions">
                      <button type="button" className="outline-button" onClick={() => openEditModal(customer)}>
                        Edit
                      </button>
                      <button type="button" className="outline-button customer-pro-delete-button" onClick={() => handleDelete(customer)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-empty">No customers match the current search and filters.</div>
            )}
          </div>

          {!isLoading && filteredCustomers.length ? (
            <div className="customer-pro-mobile-grid">
              {filteredCustomers.map((customer) => (
                <article key={`mobile-${customer.id}`} className="customer-pro-mobile-card customer-pro-mobile-card-clean">
                  <div className="customer-pro-mobile-head">
                    <div>
                      <strong>{customer.name}</strong>
                      <p>{customer.phone || customer.email || "No direct contact"}</p>
                    </div>
                    <span className={`customer-status customer-status-${customer.status}`}>{customer.status}</span>
                  </div>

                  <div className="customer-pro-mobile-grid-inner">
                    <div><span>Segment</span><strong>{customer.segment}</strong></div>
                    <div><span>Orders</span><strong>{customer.orders}</strong></div>
                    <div><span>Revenue</span><strong>{formatCurrency(customer.revenue)}</strong></div>
                    <div><span>Due</span><strong>{formatCurrency(customer.due)}</strong></div>
                  </div>

                  <div className="customer-pro-mobile-actions">
                    <button type="button" className="outline-button" onClick={() => openEditModal(customer)}>
                      Edit
                    </button>
                    <button type="button" className="outline-button customer-pro-delete-button" onClick={() => handleDelete(customer)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      {isModalOpen ? (
        <div className="route-modal-overlay" onClick={closeModal}>
          <div className="route-modal-shell customer-form-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="purchase-modal-card">
              <div className="purchase-modal-header customer-modal-header">
                <div className="purchase-header-copy">
                  <div>
                    <span className="customer-pro-panel-label">Customer profile</span>
                    <h1>{form.id ? "Edit customer" : "Add customer"}</h1>
                    <p>Capture reliable contact information, segmentation, and internal context for sales and follow-up work.</p>
                  </div>
                </div>
                <button type="button" className="outline-button warranty-modal-close" onClick={closeModal}>
                  <CloseIcon />
                </button>
              </div>

              <div className="purchase-modal-body">
                <section className="purchase-panel">
                  <form className="customer-pro-form" onSubmit={handleSubmit}>
                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Customer name</span>
                        <input className="purchase-input" type="text" placeholder="Full customer name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Phone number</span>
                        <input className="purchase-input" type="text" placeholder="+8801XXXXXXXXX" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                      </label>
                    </div>

                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Email address</span>
                        <input className="purchase-input" type="email" placeholder="customer@example.com" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                      </label>
                      <label className="purchase-field-stack">
                        <span>Address</span>
                        <input className="purchase-input" type="text" placeholder="House, road, area, city" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
                      </label>
                    </div>

                    <div className="purchase-grid purchase-grid-two">
                      <label className="purchase-field-stack">
                        <span>Segment</span>
                        <select className="purchase-input" value={form.segment} onChange={(event) => setForm((current) => ({ ...current, segment: event.target.value }))}>
                          <option value="retail">Retail</option>
                          <option value="wholesale">Wholesale</option>
                          <option value="corporate">Corporate</option>
                          <option value="service">Service</option>
                        </select>
                      </label>
                      <label className="purchase-field-stack">
                        <span>Status</span>
                        <select className="purchase-input" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                          <option value="active">Active</option>
                          <option value="follow-up">Follow-up</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                    </div>

                    <label className="purchase-field-stack">
                      <span>Internal note</span>
                      <textarea className="purchase-textarea" placeholder="Preferred products, relationship notes, payment behavior, or follow-up context" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
                    </label>

                    <div className="customer-pro-action-row">
                      <button type="submit" className="primary-button" disabled={isSaving}>
                        <PlusIcon />
                        <span>{isSaving ? "Saving..." : form.id ? "Update customer" : "Save customer"}</span>
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
