"use client";

import { useEffect, useMemo, useState } from "react";
import BoxIcon from "@/components/svgs/BoxIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import GlobeIcon from "@/components/svgs/GlobeIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import StoreIcon from "@/components/svgs/StoreIcon";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";
import { formatListDateTime } from "@/lib/dateFormat";

const DEFAULT_CAPITAL_ACCOUNT = { id: "cash", name: "Cash", type: "bank" };
const STOCK_CARD_TONES = ["stat-card stat-lavender", "stat-card stat-sky", "stat-card stat-green"];

const MASTER_SECTIONS = [
  { type: "category", label: "Category", placeholder: "Enter category", icon: BoxIcon },
  { type: "supplier", label: "Supplier", placeholder: "Enter supplier", icon: StoreIcon },
  { type: "brand", label: "Brand", placeholder: "Enter brand", icon: GlobeIcon },
  { type: "bank", label: "Bank", placeholder: "Enter bank", icon: MoneyIcon },
  { type: "model", label: "Color", placeholder: "Enter color", icon: GlobeIcon },
  { type: "variant", label: "Variant", placeholder: "Enter variant", icon: CheckIcon },
];

function normalizeLabel(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeKey(value) {
  return normalizeLabel(value).toLowerCase();
}

function getDeleteTypeLabel(type) {
  return type === "model" ? "color" : type;
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MasterDataDropdownField({
  label,
  name,
  value,
  onValueChange,
  options,
  required = false,
  onAdd,
  addDisabled = false,
  addLabel = "Add",
  inputPlaceholder = "",
  hideLabel = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = String(value || "").trim().toLowerCase();
  const hasMatchingOption = options.some((option) => option.name.trim().toLowerCase() === normalizedValue);
  const filteredOptions = hasMatchingOption
    ? options
    : options.filter((option) => option.name.toLowerCase().includes(normalizedValue));
  const shouldShowAddButton = normalizedValue.length > 0 && !hasMatchingOption;
  const shouldShowOptions = isOpen && filteredOptions.length > 0;

  return (
    <label className="purchase-field-stack">
      {hideLabel ? <span className="admin-field-label-hidden">{label}</span> : <span>{label}</span>}
      <div className="supplier-field-row">
        <div className="purchase-master-field">
          <input
            className="purchase-input purchase-select-input admin-input"
            type="text"
            name={name}
            value={value}
            onChange={(event) => {
              onValueChange(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 120);
            }}
            placeholder={inputPlaceholder}
            required={required}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === "Enter" && shouldShowAddButton && !addDisabled) {
                event.preventDefault();
                onAdd();
              }
            }}
          />
          <span className="purchase-select-arrow" aria-hidden="true">
            <ChevronDownIcon />
          </span>
          {shouldShowOptions ? (
            <div className="purchase-master-options">
              {filteredOptions.slice(0, 20).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="purchase-master-option"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onValueChange(option.name);
                    setIsOpen(false);
                  }}
                >
                  {option.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {shouldShowAddButton ? (
          <button type="button" className="purchase-ghost-button" onClick={onAdd} disabled={addDisabled}>
            {addLabel}
          </button>
        ) : (
          <div aria-hidden="true" />
        )}
      </div>
    </label>
  );
}

export default function AdminDashboard() {
  const { t } = usePurchaseLanguage();
  const [items, setItems] = useState({
    category: [],
    supplier: [],
    brand: [],
    model: [],
    variant: [],
    bank: [],
    capital: [],
  });
  const [capitalEntries, setCapitalEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittingType, setSubmittingType] = useState("");
  const [deletingKey, setDeletingKey] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [formValues, setFormValues] = useState({
    category: "",
    supplier: "",
    brand: "",
    bank: "",
    model: "",
    variant: "",
    capitalMode: "add",
    capitalAccount: "Cash",
    capitalAmount: "",
    capitalNote: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [masterResponse, stockResponse] = await Promise.all([
          fetch("/api/master-data", { cache: "no-store" }),
          fetch("/api/stock", { cache: "no-store" }),
        ]);
        const [masterResult, stockResult] = await Promise.all([masterResponse.json(), stockResponse.json()]);

        if (!masterResponse.ok) {
          throw new Error(masterResult.error || "Failed to load master data.");
        }

        if (!stockResponse.ok) {
          throw new Error(stockResult.error || "Failed to load stock.");
        }

        if (isMounted) {
          setItems(masterResult.items || {});
          const capitalItems = Array.isArray(masterResult.items?.capital) ? masterResult.items.capital : [];
          setCapitalEntries(
            [...capitalItems].sort(
              (left, right) => new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime(),
            ),
          );
          setProducts(Array.isArray(stockResult.products) ? stockResult.products : []);
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

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  function handleChange(type, value) {
    setFormValues((currentValue) => ({
      ...currentValue,
      [type]: value,
    }));
  }

  function formatCurrency(value) {
    return `Tk ${Number(value || 0).toFixed(0)}`;
  }

  const capitalAccounts = useMemo(() => {
    const bankItems = Array.isArray(items.bank) ? items.bank : [];
    const dedupedBanks = bankItems.filter(
      (item, index, collection) => collection.findIndex((entry) => normalizeKey(entry.name) === normalizeKey(item.name)) === index,
    );

    return [DEFAULT_CAPITAL_ACCOUNT, ...dedupedBanks].sort((left, right) => {
      if (normalizeKey(left.name) === "cash") {
        return -1;
      }
      if (normalizeKey(right.name) === "cash") {
        return 1;
      }
      return left.name.localeCompare(right.name);
    });
  }, [items.bank]);

  const stockSegments = useMemo(() => {
    const masterBrands = Array.isArray(items.brand) ? items.brand : [];
    const uniqueBrandNames = masterBrands
      .map((brand) => normalizeLabel(brand.name))
      .filter(Boolean)
      .filter(
      (brandName, index, collection) => collection.findIndex((entry) => normalizeKey(entry) === normalizeKey(brandName)) === index,
      );

    return [
      { key: "total", label: "Total Stock", tone: STOCK_CARD_TONES[0], icon: BoxIcon },
      ...uniqueBrandNames
        .sort((left, right) => left.localeCompare(right))
        .map((brandName, index) => ({
          key: normalizeKey(brandName),
          label: brandName,
          tone: STOCK_CARD_TONES[index % STOCK_CARD_TONES.length],
          icon: GlobeIcon,
        })),
    ];
  }, [items.brand]);

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

  function openDeleteModal(type, item) {
    setPendingDelete({ type, item });
  }

  function closeDeleteModal() {
    if (deletingKey) {
      return;
    }

    setPendingDelete(null);
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
      setPendingDelete(null);
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete master data.");
    } finally {
      setDeletingKey("");
    }
  }

  const stockCards = useMemo(() => {
    const totals = stockSegments.reduce((summary, segment) => {
      summary[segment.key] = 0;
      return summary;
    }, {});

    for (const product of products) {
      const quantity = Number(product.currentStock || 0);
      totals.total += quantity;
      const segmentKey = normalizeKey(product.brandName);
      if (segmentKey && Object.prototype.hasOwnProperty.call(totals, segmentKey)) {
        totals[segmentKey] += quantity;
      }
    }

    return stockSegments.map((segment) => ({
      ...segment,
      value: totals[segment.key] || 0,
    }));
  }, [products, stockSegments]);

  const stockSummary = useMemo(() => {
    const latestUpdatedAt = products.reduce((latest, product) => {
      const candidate = product.updatedAt || product.createdAt;
      if (!candidate) {
        return latest;
      }

      if (!latest) {
        return candidate;
      }

      return new Date(candidate).getTime() > new Date(latest).getTime() ? candidate : latest;
    }, null);

    return {
      latestUpdatedAt,
    };
  }, [products]);

  const capitalByAccount = useMemo(() => {
    const summary = capitalAccounts.reduce((collection, account) => {
      collection[normalizeKey(account.name)] = 0;
      return collection;
    }, {});

    for (const entry of capitalEntries) {
      const account = normalizeKey(entry.account || DEFAULT_CAPITAL_ACCOUNT.name);
      if (!Object.prototype.hasOwnProperty.call(summary, account)) {
        continue;
      }

      summary[account] += Number(entry.amount || 0);
    }

    return summary;
  }, [capitalAccounts, capitalEntries]);

  async function handleAddMasterItem(type, fieldName, label) {
    const normalizedName = normalizeLabel(formValues[fieldName]);
    if (!normalizedName) {
      setErrorMessage(`${label} name is required.`);
      return;
    }

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
          name: normalizedName,
        }),
      });
      const result = await response.json();

      let savedItem = null;
      if (!response.ok) {
        if (response.status === 409 && result.item) {
          savedItem = result.item;
        } else {
          throw new Error(result.error || `Failed to save ${label.toLowerCase()}.`);
        }
      } else {
        savedItem = result.item;
      }

      if (!savedItem) {
        throw new Error(`Failed to save ${label.toLowerCase()}.`);
      }

      setItems((currentValue) => {
        const currentItems = Array.isArray(currentValue[type]) ? currentValue[type] : [];
        const alreadyExists = currentItems.some((entry) => entry.id === savedItem.id);
        const nextItems = alreadyExists ? currentItems : [...currentItems, savedItem];

        return {
          ...currentValue,
          [type]: [...nextItems].sort((left, right) => left.name.localeCompare(right.name)),
        };
      });
      setFormValues((currentValue) => ({
        ...currentValue,
        [fieldName]: fieldName === "capitalAccount" ? "" : savedItem.name,
      }));
      setMessage(`${savedItem.name} added.`);
    } catch (error) {
      setErrorMessage(error.message || `Failed to save ${label.toLowerCase()}.`);
    } finally {
      setSubmittingType("");
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
          account: normalizeLabel(formValues.capitalAccount) || DEFAULT_CAPITAL_ACCOUNT.name,
          note: formValues.capitalNote,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save capital adjustment.");
      }

      setCapitalEntries((currentValue) => [result.item, ...currentValue]);
      setFormValues((currentValue) => ({
        ...currentValue,
        capitalMode: "add",
        capitalAccount: normalizeLabel(currentValue.capitalAccount) || DEFAULT_CAPITAL_ACCOUNT.name,
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
      <section className="admin-hero">
        <div className="admin-hero-content">
          <h2>Dashboard</h2>
          <p>Last Stock Update</p>
        </div>
        <div className="admin-hero-meta">
          <span>Updated</span>
          <strong>
            {stockSummary.latestUpdatedAt ? formatListDateTime(stockSummary.latestUpdatedAt) : "No updates"}
          </strong>
        </div>
      </section>

      {message ? <p className="admin-feedback admin-feedback-success">{message}</p> : null}
      {errorMessage ? <p className="admin-feedback admin-feedback-error">{errorMessage}</p> : null}

      <div className="stats-grid admin-stats-grid">
        {stockCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.key} className={card.tone}>
              <span className="stat-icon">
                <Icon />
              </span>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
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
        </div>

        <div className="admin-capital-summary">
          {capitalAccounts.map((account) => (
            <article key={account.id || account.name} className="admin-capital-stat">
              <span className="admin-capital-stat-icon">
                <MoneyIcon />
              </span>
              <div>
                <span>{account.name}</span>
                <strong>{formatCurrency(capitalByAccount[normalizeKey(account.name)])}</strong>
              </div>
              {account.id !== DEFAULT_CAPITAL_ACCOUNT.id ? (
                <button
                  type="button"
                  className="admin-capital-stat-delete"
                  onClick={() => openDeleteModal("bank", account)}
                  disabled={deletingKey === `bank:${account.id}`}
                  aria-label={`Delete ${account.name}`}
                >
                  {deletingKey === `bank:${account.id}` ? "..." : <CloseIcon />}
                </button>
              ) : null}
            </article>
          ))}
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
            <MasterDataDropdownField
              label="Bank"
              name="capitalAccount"
              value={formValues.capitalAccount}
              onValueChange={(nextValue) => handleChange("capitalAccount", nextValue)}
              options={capitalAccounts}
              required
              onAdd={() => handleAddMasterItem("bank", "capitalAccount", "Bank")}
              addDisabled={submittingType === "bank"}
              addLabel={submittingType === "bank" ? t.adminLoading : "Add"}
              inputPlaceholder="Type or select cash / bank"
              hideLabel
            />
            <input
              className="purchase-input admin-input"
              type="number"
              step="1"
              value={formValues.capitalAmount}
              onChange={(event) => handleChange("capitalAmount", event.target.value)}
              placeholder={
                formValues.capitalMode === "reduce"
                  ? `Enter amount to subtract from ${normalizeLabel(formValues.capitalAccount) || "cash"}`
                  : `Enter amount to add into ${normalizeLabel(formValues.capitalAccount) || "cash"}`
              }
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
      {!isLoading ? (
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
                    <h3>{section.label}</h3>
                  </div>
                </div>

                <form className="admin-form" onSubmit={(event) => handleSubmit(event, section.type)}>
                  <input
                    className="purchase-input admin-input"
                    type="text"
                    value={formValues[section.type]}
                    onChange={(event) => handleChange(section.type, event.target.value)}
                    placeholder={section.placeholder}
                    required
                  />
                  <button type="submit" className="admin-submit-button" disabled={submittingType === section.type}>
                    {submittingType === section.type ? t.adminLoading : "Add"}
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
                            onClick={() => openDeleteModal(section.type, item)}
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
      ) : null}
      {isLoading ? <div className="table-card admin-loading">{t.adminLoading}</div> : null}
      {pendingDelete ? (
        <div className="route-modal-overlay" onClick={closeDeleteModal}>
          <div
            className="route-modal-shell admin-confirm-modal-shell"
            role="dialog"
            aria-modal="true"
            aria-label={`Delete ${pendingDelete.item.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="purchase-modal-card admin-confirm-modal-card">
              <div className="purchase-modal-header admin-confirm-modal-header">
                <div className="purchase-header-copy">
                  <span className="admin-confirm-modal-badge" aria-hidden="true">
                    <CloseIcon />
                  </span>
                  <div className="purchase-header-text">
                    <h1>Delete {pendingDelete.item.name}?</h1>
                  </div>
                </div>
                <button
                  type="button"
                  className="purchase-modal-close-button"
                  onClick={closeDeleteModal}
                  aria-label="Close confirmation dialog"
                  disabled={Boolean(deletingKey)}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="purchase-modal-body admin-confirm-modal-body">
                <p className="admin-confirm-modal-copy">Remove from {getDeleteTypeLabel(pendingDelete.type)}</p>
              </div>
              <footer className="purchase-modal-footer admin-confirm-modal-footer">
                <button type="button" className="purchase-cancel" onClick={closeDeleteModal} disabled={Boolean(deletingKey)}>
                  Cancel
                </button>
                <div className="purchase-footer-actions">
                  <button
                    type="button"
                    className="purchase-primary-action admin-confirm-delete-button"
                    onClick={() => handleDelete(pendingDelete.type, pendingDelete.item)}
                    disabled={Boolean(deletingKey)}
                  >
                    {deletingKey ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
