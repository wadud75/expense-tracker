"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MoneyIcon from "@/components/svgs/MoneyIcon";

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

function formatSalary(value) {
  return `Tk ${Number(value || 0).toFixed(0)}`;
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

function buildSalaryHistory(seller, monthsToShow = 12) {
  const paymentMap = new Map((seller?.salaryPayments || []).map((entry) => [entry.monthKey, entry]));
  const history = [];
  const today = new Date();

  for (let index = 0; index < monthsToShow; index += 1) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const monthKey = getMonthKey(monthDate);
    const payment = paymentMap.get(monthKey);

    history.push({
      monthKey,
      label: formatMonthLabel(monthKey),
      amount: Number(payment?.amount ?? seller?.salary ?? 0),
      status: payment ? "paid" : "unpaid",
      paidAt: payment?.paidAt || "",
      note: payment?.note || "",
    });
  }

  return history;
}

function getStatusTone(status) {
  return status === "paid" ? "settled" : "open";
}

export default function SellerSalaryHistoryContent({ sellerId, modal = false }) {
  const [seller, setSeller] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionKey, setActionKey] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSeller() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/master-data", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load seller salary history.");
        }

        const nextSeller = (result.items?.seller || []).find((entry) => entry.id === sellerId) || null;

        if (!active) {
          return;
        }

        if (!nextSeller) {
          throw new Error("Seller not found.");
        }

        setSeller(nextSeller);
      } catch (error) {
        if (active) {
          setErrorMessage(error.message || "Failed to load seller salary history.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadSeller();

    return () => {
      active = false;
    };
  }, [sellerId]);

  const history = useMemo(() => buildSalaryHistory(seller), [seller]);
  const paidCount = history.filter((entry) => entry.status === "paid").length;

  async function handleSalaryAction(entry, action) {
    if (!seller?.id) return;

    const nextActionKey = `${seller.id}:${entry.monthKey}:${action}`;
    if (actionKey === nextActionKey) return;

    try {
      setActionKey(nextActionKey);
      setFeedback("");
      setErrorMessage("");

      const response = await fetch("/api/master-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: seller.id,
          type: "seller",
          action,
          monthKey: entry.monthKey,
          amount: seller.salary,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update salary payment.");
      }

      setSeller(result.item);
      setFeedback(
        action === "pay"
          ? `${seller.name} salary marked paid for ${entry.label}.`
          : `${seller.name} salary marked unpaid for ${entry.label}.`,
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to update salary payment.");
    } finally {
      setActionKey("");
    }
  }

  return (
    <section className={modal ? "seller-page-shell seller-page-shell-modal" : "content-area seller-page-shell seller-salary-page"}>
      <div className="seller-page-head">
        <span className="seller-pro-panel-label">Seller payroll</span>
        <h1>{isLoading ? "Loading seller history" : seller?.name || "Seller history"}</h1>
        <p>Review monthly salary status and update any month between paid and unpaid without leaving the seller workspace.</p>
      </div>

      {feedback ? <p className="admin-feedback admin-feedback-success">{feedback}</p> : null}
      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="seller-pro-summary-grid">
        <article className="seller-pro-summary-card seller-pro-summary-card-amber">
          <span className="seller-pro-summary-icon"><MoneyIcon /></span>
          <div className="seller-pro-summary-copy">
            <span>Monthly salary</span>
            <strong>{formatSalary(seller?.salary)}</strong>
            <p>Current configured seller salary</p>
          </div>
        </article>
        <article className="seller-pro-summary-card seller-pro-summary-card-green">
          <span className="seller-pro-summary-icon"><MoneyIcon /></span>
          <div className="seller-pro-summary-copy">
            <span>Paid months</span>
            <strong>{paidCount}</strong>
            <p>Recorded as paid in the last 12 months</p>
          </div>
        </article>
      </div>

      <section className="seller-pro-panel">
        <div className="seller-pro-panel-head seller-pro-panel-head-tight">
          <div>
            <span className="seller-pro-panel-label">Monthly history</span>
            <h3>Salary payment ledger</h3>
            <p>Every row shows one month, current status, payment date, and quick actions.</p>
          </div>
          {!modal ? <Link href="/sellers" className="outline-button">Back to sellers</Link> : null}
        </div>

        {isLoading ? (
          <div className="table-empty seller-salary-history-empty">Loading salary history...</div>
        ) : seller ? (
          <div className="seller-salary-history-grid">
            {history.map((entry) => {
              const payActionKey = `${seller.id}:${entry.monthKey}:pay`;
              const unpayActionKey = `${seller.id}:${entry.monthKey}:unpay`;

              return (
                <article key={entry.monthKey} className="seller-salary-history-card">
                  <div className="seller-salary-history-copy">
                    <strong>{entry.label}</strong>
                    <span className={`due-status due-status-${getStatusTone(entry.status)}`}>
                      {entry.status === "paid" ? "Paid" : "Unpaid"}
                    </span>
                    <small>Amount {formatSalary(entry.amount)}</small>
                    <small>{entry.paidAt ? `Paid on ${formatDate(entry.paidAt)}` : "No payment recorded yet"}</small>
                  </div>

                  <div className="seller-salary-history-actions">
                    {entry.status === "paid" ? (
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => handleSalaryAction(entry, "unpay")}
                        disabled={actionKey === unpayActionKey}
                      >
                        {actionKey === unpayActionKey ? "Updating..." : "Mark unpaid"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="outline-button"
                        onClick={() => handleSalaryAction(entry, "pay")}
                        disabled={actionKey === payActionKey}
                      >
                        {actionKey === payActionKey ? "Paying..." : "Mark paid"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="table-empty seller-salary-history-empty">Seller not found.</div>
        )}
      </section>
    </section>
  );
}
