"use client";

import { useEffect, useMemo, useState } from "react";
import BoxIcon from "@/components/svgs/BoxIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import GlobeIcon from "@/components/svgs/GlobeIcon";
import { translations } from "@/components/purchase/purchaseContent";
import StoreIcon from "@/components/svgs/StoreIcon";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";

const MASTER_SECTIONS = [
  { type: "category", field: "categoryName", placeholder: "categoryPlaceholder", icon: BoxIcon, tone: "stat-card stat-lavender" },
  { type: "supplier", field: "supplierTitle", placeholder: "selectSupplier", icon: StoreIcon, tone: "stat-card stat-sky" },
  { type: "brand", field: "brandName", placeholder: "selectBrand", icon: GlobeIcon, tone: "stat-card stat-green" },
  { type: "variant", field: "variantName", placeholder: "selectVariant", icon: CheckIcon, tone: "stat-card stat-lavender" },
  { type: "seller", field: "sellerName", placeholder: "sellerPlaceholder", icon: StoreIcon, tone: "stat-card stat-amber" },
];

export default function AdminDashboard() {
  usePurchaseLanguage();
  const t = translations.en;
  const [items, setItems] = useState({
    category: [],
    supplier: [],
    brand: [],
    model: [],
    variant: [],
    seller: [],
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
    variant: "",
    seller: "",
  });

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
