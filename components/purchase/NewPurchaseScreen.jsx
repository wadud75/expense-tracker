"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";

const PAYMENT_METHODS = ["Cash", "Bank", "Card", "Mobile Banking"];
const EMPTY_MASTER_DATA = {
  category: [],
  supplier: [],
  brand: [],
  model: [],
  variant: [],
};

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedValue = String(value || "").trim().toLowerCase();
  const filteredOptions = options.filter((option) => option.name.toLowerCase().includes(normalizedValue));
  const hasMatchingOption = options.some((option) => option.name.trim().toLowerCase() === normalizedValue);
  const shouldShowAddButton = normalizedValue.length > 0 && !hasMatchingOption;
  const shouldShowOptions = isOpen && filteredOptions.length > 0;

  return (
    <label className="purchase-field-stack">
      <span>{label}</span>
      <div className="supplier-field-row">
        <div className="purchase-master-field">
          <input
            className="purchase-input purchase-select-input"
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

function DropdownField({ label, value, name, onChange, children, required = false }) {
  return (
    <label className="purchase-field-stack">
      <span>{label}</span>
      <div className="purchase-select-wrap">
        <select
          className="purchase-input purchase-select purchase-select-input"
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        >
          {children}
        </select>
        <span className="purchase-select-arrow" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
  );
}

function PurchaseFormContent({ modal, t, router }) {
  const [formState, setFormState] = useState({
    supplierName: "",
    productName: "",
    brandName: "",
    modelName: "",
    variantName: "",
    categoryName: "",
    quantity: "1",
    unitPrice: "",
    paymentMethod: "Cash",
    paymentAmount: "",
    notes: "",
  });
  const [masterData, setMasterData] = useState(EMPTY_MASTER_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingMasterType, setSavingMasterType] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const quantity = Math.max(Number(formState.quantity) || 0, 0);
  const unitPrice = Math.max(Number(formState.unitPrice) || 0, 0);
  const paymentAmount = Math.max(Number(formState.paymentAmount) || 0, 0);
  const estimatedTotal = quantity * unitPrice;
  const remainingBalance = Math.max(estimatedTotal - paymentAmount, 0);

  useEffect(() => {
    let isMounted = true;

    async function loadMasterData() {
      try {
        const response = await fetch("/api/master-data", { cache: "no-store" });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load dropdown data.");
        }

        if (isMounted) {
          setMasterData({ ...EMPTY_MASTER_DATA, ...(result.items || {}) });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load dropdown data.");
        }
      }
    }

    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((currentValue) => ({
      ...currentValue,
      [name]: value,
    }));
  };

  async function handleAddMasterItem(type, fieldName, label) {
    const normalizedName = String(formState[fieldName] || "").trim();
    if (!normalizedName) {
      setErrorMessage(`${label} name is required.`);
      return;
    }

    setErrorMessage("");
    setSavingMasterType(type);

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

      setMasterData((currentValue) => {
        const currentItems = Array.isArray(currentValue[type]) ? currentValue[type] : [];
        const alreadyExists = currentItems.some((entry) => entry.id === savedItem.id);
        const nextItems = alreadyExists ? currentItems : [...currentItems, savedItem];

        return {
          ...currentValue,
          [type]: [...nextItems].sort((left, right) => left.name.localeCompare(right.name)),
        };
      });
      setFormState((currentValue) => ({
        ...currentValue,
        [fieldName]: "",
      }));
    } catch (error) {
      setErrorMessage(error.message || `Failed to save ${label.toLowerCase()}.`);
    } finally {
      setSavingMasterType("");
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierName: formState.supplierName,
          productName: formState.productName,
          brandName: formState.brandName,
          modelName: formState.modelName,
          variantName: formState.variantName,
          categoryName: formState.categoryName,
          quantity,
          unitPrice,
          paymentMethod: formState.paymentMethod,
          paymentAmount,
          notes: formState.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save purchase.");
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("purchase:created"));
      }

      if (modal) {
        router.back();
        router.refresh();
        return;
      }

      router.replace("/purchase");
      router.refresh();
    } catch (error) {
      setErrorMessage(error.message || "Failed to save purchase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={modal ? "purchase-modal-card" : "purchase-page-shell"} onSubmit={handleSubmit}>
      <header className="purchase-modal-header">
        <div className="purchase-header-copy">
          <div className="purchase-header-text">
            <h1>{t.newPurchaseTitle}</h1>
          </div>
        </div>
        {modal ? (
          <button type="button" className="purchase-modal-close-button" onClick={() => router.back()} aria-label="Close">
            <CloseIcon />
          </button>
        ) : null}
      </header>

      <div className="purchase-modal-body">
        <section className="purchase-form-grid">
          <div className="purchase-form-main">
            <section className="purchase-panel purchase-panel-items">
              <div className="purchase-details-stack">
                  <MasterDataDropdownField
                    label={t.supplierTitle}
                    name="supplierName"
                    value={formState.supplierName}
                    onValueChange={(nextValue) => handleChange({ target: { name: "supplierName", value: nextValue } })}
                    required
                    options={masterData.supplier}
                    onAdd={() => handleAddMasterItem("supplier", "supplierName", t.supplierTitle)}
                    addDisabled={savingMasterType === "supplier"}
                    addLabel={savingMasterType === "supplier" ? t.adminLoading : t.adminAdd}
                    inputPlaceholder={t.supplierPlaceholder}
                  />
                  <label className="purchase-field-stack">
                    <span>{t.product}</span>
                    <input
                      className="purchase-input"
                      type="text"
                      name="productName"
                      value={formState.productName}
                      onChange={handleChange}
                      placeholder={t.productPlaceholder}
                      required
                    />
                  </label>

                  <div className="purchase-grid purchase-grid-two purchase-grid-tight">
                    <MasterDataDropdownField
                      label={t.categoryName}
                      name="categoryName"
                      value={formState.categoryName}
                      onValueChange={(nextValue) => handleChange({ target: { name: "categoryName", value: nextValue } })}
                      required
                      options={masterData.category}
                      onAdd={() => handleAddMasterItem("category", "categoryName", t.categoryName)}
                      addDisabled={savingMasterType === "category"}
                      addLabel={savingMasterType === "category" ? t.adminLoading : t.adminAdd}
                      inputPlaceholder={t.categoryPlaceholder}
                    />
                    <MasterDataDropdownField
                      label={t.brandName}
                      name="brandName"
                      value={formState.brandName}
                      onValueChange={(nextValue) => handleChange({ target: { name: "brandName", value: nextValue } })}
                      options={masterData.brand}
                      onAdd={() => handleAddMasterItem("brand", "brandName", t.brandName)}
                      addDisabled={savingMasterType === "brand"}
                      addLabel={savingMasterType === "brand" ? t.adminLoading : t.adminAdd}
                      inputPlaceholder={t.brandPlaceholder}
                    />
                  </div>
                  <div className="purchase-grid purchase-grid-two purchase-grid-tight">
                    <MasterDataDropdownField
                      label="Color"
                      name="modelName"
                      value={formState.modelName}
                      onValueChange={(nextValue) => handleChange({ target: { name: "modelName", value: nextValue } })}
                      options={masterData.model}
                      onAdd={() => handleAddMasterItem("model", "modelName", "Color")}
                      addDisabled={savingMasterType === "model"}
                      addLabel={savingMasterType === "model" ? t.adminLoading : t.adminAdd}
                      inputPlaceholder="Type or select color"
                    />
                    <MasterDataDropdownField
                      label={t.variantName}
                      name="variantName"
                      value={formState.variantName}
                      onValueChange={(nextValue) => handleChange({ target: { name: "variantName", value: nextValue } })}
                      options={masterData.variant}
                      onAdd={() => handleAddMasterItem("variant", "variantName", t.variantName)}
                      addDisabled={savingMasterType === "variant"}
                      addLabel={savingMasterType === "variant" ? t.adminLoading : t.adminAdd}
                      inputPlaceholder={t.variantPlaceholder}
                    />
                  </div>

                  <div className="purchase-grid purchase-grid-two purchase-grid-tight">
                    <label className="purchase-field-stack">
                      <span>{t.quantity}</span>
                      <input
                        className="purchase-input"
                        type="number"
                        min="1"
                        step="1"
                        name="quantity"
                        value={formState.quantity}
                        onChange={handleChange}
                        required
                      />
                    </label>
                    <label className="purchase-field-stack">
                      <span>{t.unitPrice}</span>
                      <input
                        className="purchase-input"
                        type="number"
                        min="0"
                        step="1"
                        name="unitPrice"
                        value={formState.unitPrice}
                        onChange={handleChange}
                        required
                      />
                    </label>
                  </div>
              </div>
            </section>

            {errorMessage ? <p className="purchase-feedback purchase-feedback-error">{errorMessage}</p> : null}
          </div>

          <aside className="purchase-form-side">
            <section className="purchase-panel purchase-panel-bill purchase-panel-sticky">
              <div className="purchase-panel-head">
                <div className="purchase-panel-icon purchase-panel-icon-green">B</div>
                <div>
                  <h2>{t.paymentSummary}</h2>
                  <p>{t.paymentSummarySubtitle}</p>
                </div>
              </div>

              <div className="purchase-grid purchase-grid-two purchase-grid-tight">
                <DropdownField label={t.paymentMethod} name="paymentMethod" value={formState.paymentMethod} onChange={handleChange}>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </DropdownField>
                <label className="purchase-field-stack">
                  <span>{t.paymentAmount}</span>
                  <input
                    className="purchase-input"
                    type="number"
                    min="0"
                    step="1"
                    name="paymentAmount"
                    value={formState.paymentAmount}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              <div className="purchase-summary-stack">
                <div className="purchase-summary-bar">
                  <span>{t.estimatedTotal}</span>
                  <strong>{estimatedTotal.toFixed(0)}</strong>
                </div>

                <div className="purchase-summary-bar purchase-summary-paid">
                  <span>{t.paymentBalance}</span>
                  <strong>{remainingBalance.toFixed(0)}</strong>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>

      <footer className="purchase-modal-footer">
        {modal ? (
          <button type="button" className="purchase-cancel" onClick={() => router.back()}>
            {t.cancel}
          </button>
        ) : (
          <Link href="/purchase" className="purchase-cancel-link">
            {t.cancel}
          </Link>
        )}
        <div className="purchase-footer-total">
          <span>{t.estimatedTotal}</span>
          <strong>{estimatedTotal.toFixed(0)}</strong>
        </div>
        <div className="purchase-footer-actions">
          <button type="submit" className="purchase-primary-action" disabled={isSubmitting}>
            {isSubmitting ? t.saving : t.save}
          </button>
        </div>
      </footer>
    </form>
  );
}

export default function NewPurchaseScreen({ modal = false }) {
  const router = useRouter();
  const { t } = usePurchaseLanguage();

  if (modal) {
    return <PurchaseFormContent modal t={t} router={router} />;
  }

  return (
    <section className="content-area">
      <PurchaseFormContent modal={false} t={t} router={router} />
    </section>
  );
}
