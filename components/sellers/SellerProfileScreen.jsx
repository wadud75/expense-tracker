"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PlusIcon from "@/components/svgs/PlusIcon";

const SELLER_CREATED_EVENT = "seller:created";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  role: "sales executive",
  salary: "",
  status: "active",
  notes: "",
};

export default function SellerProfileScreen({ modal = false }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(SELLER_CREATED_EVENT, {
            detail: { seller: result.item },
          }),
        );
      }

      if (modal) {
        router.back();
        router.refresh();
        return;
      }

      router.replace("/sellers");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save seller.");
    } finally {
      setIsSaving(false);
    }
  }

  const content = (
    <form className={modal ? "seller-page-shell seller-page-shell-modal" : "seller-page-shell"} onSubmit={handleSubmit}>
      <div className="seller-page-head">
        <div>
          <span className="seller-pro-panel-label">Add seller</span>
          <h1>Create seller profile</h1>
          <p>Capture contact details, role, salary, and internal notes for your sales team roster.</p>
        </div>
      </div>

      <div className="seller-page-body">
        <div className="seller-pro-form-grid">
          <label className="purchase-field-stack">
            <span>Seller name</span>
            <input
              className="purchase-input"
              type="text"
              placeholder="Full seller name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>

          <label className="purchase-field-stack">
            <span>Email</span>
            <input
              className="purchase-input"
              type="email"
              placeholder="seller@company.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="purchase-field-stack">
            <span>Phone</span>
            <input
              className="purchase-input"
              type="text"
              placeholder="+8801XXXXXXXXX"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          <label className="purchase-field-stack">
            <span>Role</span>
            <select
              className="purchase-input"
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            >
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
            <input
              className="purchase-input"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.salary}
              onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
            />
          </label>

          <label className="purchase-field-stack">
            <span>Status</span>
            <select
              className="purchase-input"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on-leave">On leave</option>
            </select>
          </label>

          <label className="purchase-field-stack seller-pro-form-span-two">
            <span>Address</span>
            <input
              className="purchase-input"
              type="text"
              placeholder="House, road, area, city"
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </label>

          <label className="purchase-field-stack seller-pro-form-span-two">
            <span>Notes</span>
            <textarea
              className="purchase-textarea"
              placeholder="Employment note, shift details, commission note, or account context"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
        </div>

        {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}
      </div>

      <div className="seller-page-footer">
        {modal ? (
          <button type="button" className="outline-button" onClick={() => router.back()}>
            Cancel
          </button>
        ) : (
          <Link href="/sellers" className="outline-button seller-page-link-button">
            Cancel
          </Link>
        )}

        <button type="submit" className="primary-button" disabled={isSaving}>
          <PlusIcon />
          <span>{isSaving ? "Saving..." : "Save seller"}</span>
        </button>
      </div>
    </form>
  );

  if (modal) {
    return content;
  }

  return <section className="content-area seller-create-route">{content}</section>;
}
