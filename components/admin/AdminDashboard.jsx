"use client";

import { useEffect, useMemo, useState } from "react";
import BoxIcon from "@/components/svgs/BoxIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import GlobeIcon from "@/components/svgs/GlobeIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import StoreIcon from "@/components/svgs/StoreIcon";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";

const MASTER_SECTIONS = [
  { type: "category", field: "categoryName", placeholder: "categoryPlaceholder", icon: BoxIcon, tone: "stat-card stat-lavender" },
  { type: "supplier", field: "supplierTitle", placeholder: "selectSupplier", icon: StoreIcon, tone: "stat-card stat-sky" },
  { type: "brand", field: "brandName", placeholder: "selectBrand", icon: GlobeIcon, tone: "stat-card stat-green" },
  { type: "model", field: "modelName", placeholder: "selectModel", icon: GlobeIcon, tone: "stat-card stat-sky" },
  { type: "variant", field: "variantName", placeholder: "selectVariant", icon: CheckIcon, tone: "stat-card stat-lavender" },
];

export default function AdminDashboard() {
  const { t } = usePurchaseLanguage();
  const [items, setItems] = useState({
    category: [],
    supplier: [],
    brand: [],
    model: [],
    variant: [],
    capital: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittingType, setSubmittingType] = useState("");
  const [deletingKey, setDeletingKey] = useState("");
  const [formValues, setFormValues] = useState({
    category: "",
    supplier: "",
    brand: "",
    model: "",
    variant: "",
    capitalMode: "add",
    capitalAmount: "",
    capitalNote: "",
  });

  const capitalEntries = useMemo(
    () =>
      [...(items.capital || [])].sort(
        (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
      ),
    [items.capital],
  );

  const capitalSummary = useMemo(
    () =>
      capitalEntries.reduce(
        (summary, entry) => {
          const amount = Number(entry.amount || 0);
          summary.total += amount;
          if (amount >= 0) {
            summary.added += amount;
          } else {
            summary.removed += Math.abs(amount);
          }
          return summary;
        },
        { total: 0, added: 0, removed: 0 },
      ),
    [capitalEntries],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMasterData() {
      try {
        const response = await fetch("/api/master-data", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load master data.");
        }

        if (isMounted) {
          setItems(result.items || {});
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load master data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = useMemo(
    () =>
      MASTER_SECTIONS.map((section) => ({
        ...section,
        label: t[section.field] || section.field,
        total: items[section.type]?.length || 0,
      })),
    [items, t],
  );

  function handleChange(type, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [type]: value,
    }));
  }

  function formatCurrency(value) {
    return `Tk ${Number(value || 0).toFixed(2)}`;
  }

  async function handleSubmit(event, type) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setSubmittingType(type);

    try {
      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          name: formValues[type],
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save master data.");
      }

      setItems((currentValue) => ({
        ...currentValue,
        [type]: [...(currentValue[type] || []), result.item].sort((left, right) => left.name.localeCompare(right.name)),
      }));
      setFormValues((currentValue) => ({
        ...currentValue,
        [type]: "",
      }));
      setMessage(`${result.item.name} added.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to save master data.");
    } finally {
      setSubmittingType("");
    }
  }

  async function handleDelete(type, item) {
    setMessage("");
    setErrorMessage("");
    setDeletingKey(`${type}:${item.id}`);

    try {
      const response = await fetch("/api/master-data", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          id: item.id,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete master data.");
      }

      setItems((currentValue) => ({
        ...currentValue,
        [type]: (currentValue[type] || []).filter((entry) => entry.id !== item.id),
      }));
      setMessage(`${item.name} deleted.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete master data.");
    } finally {
      setDeletingKey("");
    }
  }

  async function handleCapitalSubmit(event) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");
    setSubmittingType("capital");

    try {
      const rawAmount = Number(formValues.capitalAmount || 0);

      if (rawAmount <= 0) {
        throw new Error("Capital amount must be greater than zero.");
      }

      const amount = formValues.capitalMode === "reduce" ? -rawAmount : rawAmount;

      const response = await fetch("/api/master-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "capital",
          amount,
          note: formValues.capitalNote,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save capital adjustment.");
      }

      setItems((currentValue) => ({
        ...currentValue,
        capital: [result.item, ...(currentValue.capital || [])],
      }));
      setFormValues((currentValue) => ({
        ...currentValue,
        capitalMode: "add",
        capitalAmount: "",
        capitalNote: "",
      }));
      setMessage("Capital adjustment saved.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save capital adjustment.");
    } finally {
      setSubmittingType("");
    }
  }

  return (
    <section className="content-area admin-page">
      <div className="section-heading admin-heading">
        <div>
          <h2>{t.adminPageTitle}</h2>
          <p>{t.adminPageSubtitle}</p>
        </div>
      </div>

      {message ? <p className="admin-feedback admin-feedback-success">{message}</p> : null}
      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="stats-grid admin-stats-grid">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.type} className={card.tone}>
              <span className="stat-icon">
                <Icon />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.total}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <section className="admin-card admin-capital-card">
        <div className="admin-card-head">
          <div className="admin-card-title-row">
            <span className="admin-card-icon">
              <MoneyIcon />
            </span>
            <h3>Business capital adjustment</h3>
          </div>
          <p>Add capital to increase tracked cash or reduce capital to withdraw cash from the business.</p>
        </div>

        <div className={`admin-capital-banner admin-capital-banner-${formValues.capitalMode}`}>
          <strong>{formValues.capitalMode === "reduce" ? "Reduce business cash" : "Add business cash"}</strong>
          <span>
            {formValues.capitalMode === "reduce"
              ? "Record cash withdrawn from the business as a capital reduction."
              : "Record fresh capital entering the business as cash."}
          </span>
        </div>

        <div className="admin-capital-summary">
          <article className="admin-capital-stat">
            <span>Net capital</span>
            <strong>{formatCurrency(capitalSummary.total)}</strong>
          </article>
          <article className="admin-capital-stat">
            <span>Total added</span>
            <strong>{formatCurrency(capitalSummary.added)}</strong>
          </article>
          <article className="admin-capital-stat">
            <span>Total reduced</span>
            <strong>{formatCurrency(capitalSummary.removed)}</strong>
          </article>
        </div>

        <form className="admin-capital-form" onSubmit={handleCapitalSubmit}>
          <div className="admin-capital-mode-group">
            <button
              type="button"
              className={`outline-button admin-capital-mode-button${formValues.capitalMode === "add" ? " admin-capital-mode-button-active" : ""}`}
              onClick={() => handleChange("capitalMode", "add")}
            >
              Add Capital
            </button>
            <button
              type="button"
              className={`outline-button admin-capital-mode-button${formValues.capitalMode === "reduce" ? " admin-capital-mode-button-active" : ""}`}
              onClick={() => handleChange("capitalMode", "reduce")}
            >
              Reduce Capital
            </button>
          </div>
          <div className="admin-capital-input-row">
            <input
              className="purchase-input admin-input"
              type="number"
              step="0.01"
              value={formValues.capitalAmount}
              onChange={(event) => handleChange("capitalAmount", event.target.value)}
              placeholder={formValues.capitalMode === "reduce" ? "Enter amount to subtract from cash" : "Enter amount to add into cash"}
              required
            />
            <input
              className="purchase-input admin-input"
              type="text"
              value={formValues.capitalNote}
              onChange={(event) => handleChange("capitalNote", event.target.value)}
              placeholder={formValues.capitalMode === "reduce" ? "Reason for capital withdrawal" : "Source or note for capital injection"}
            />
            <button type="submit" className="admin-submit-button" disabled={submittingType === "capital"}>
              {submittingType === "capital" ? t.adminLoading : formValues.capitalMode === "reduce" ? "Save reduction" : "Save addition"}
            </button>
          </div>
        </form>
      </section>

      {isLoading ? (
        <div className="table-card admin-loading">{t.adminLoading}</div>
      ) : (
        <div className="admin-grid">
          {MASTER_SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <section key={section.type} className="admin-card">
                <div className="admin-card-head">
                  <div className="admin-card-title-row">
                    <span className="admin-card-icon">
                      <Icon />
                    </span>
                    <h3>{t[section.field] || section.field}</h3>
                  </div>
                </div>

                <form className="admin-form" onSubmit={(event) => handleSubmit(event, section.type)}>
                  <input
                    className="purchase-input admin-input"
                    type="text"
                    value={formValues[section.type]}
                    onChange={(event) => handleChange(section.type, event.target.value)}
                    placeholder={t[section.placeholder] || section.placeholder}
                    required
                  />
                  <button type="submit" className="admin-submit-button" disabled={submittingType === section.type}>
                    {submittingType === section.type ? t.adminLoading : t.adminAdd}
                  </button>
                </form>

                <div className="admin-chip-list">
                  {items[section.type]?.length ? (
                    items[section.type].map((item) => {
                      const currentDeleteKey = `${section.type}:${item.id}`;
                      const isDeleting = deletingKey === currentDeleteKey;

                      return (
                        <span key={item.id} className="admin-chip admin-chip-removable">
                          <span className="admin-chip-label">{item.name}</span>
                          <button
                            type="button"
                            className="admin-chip-delete"
                            onClick={() => handleDelete(section.type, item)}
                            disabled={isDeleting}
                            aria-label={`Delete ${item.name}`}
                          >
                            {isDeleting ? "..." : <CloseIcon />}
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="admin-empty">{t.adminEmpty}</span>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
