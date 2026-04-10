"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import usePurchaseLanguage from "@/components/purchase/usePurchaseLanguage";
import { uploadToImageKit } from "@/lib/uploadToImageKit";

const PAYMENT_METHODS = ["Cash", "Bank", "Card", "Mobile Banking"];
const EMPTY_MASTER_DATA = {
  category: [],
  supplier: [],
  brand: [],
  variant: [],
};

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
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
  const fileInputRef = useRef(null);
  const [formState, setFormState] = useState({
    supplierName: "",
    productName: "",
    brandName: "",
    variantName: "",
    categoryName: "",
    quantity: "1",
    unitPrice: "",
    paymentMethod: "Cash",
    paymentAmount: "",
    notes: "",
  });
  const [masterData, setMasterData] = useState(EMPTY_MASTER_DATA);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      let uploadResult = null;

      if (selectedFile) {
        uploadResult = await uploadToImageKit(selectedFile, {
          folder: "/purchases",
          fileName: `purchase-${Date.now()}`,
        });
      }

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierName: formState.supplierName,
          productName: formState.productName,
          brandName: formState.brandName,
          variantName: formState.variantName,
          categoryName: formState.categoryName,
          quantity,
          unitPrice,
          paymentMethod: formState.paymentMethod,
          paymentAmount,
          notes: formState.notes,
          imageUrl: uploadResult?.url || "",
          imageFileId: uploadResult?.fileId || "",
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
        <span className="purchase-item-pill">{t.itemsCount}</span>
      </header>

      <div className="purchase-modal-body">
        <section className="purchase-form-grid">
          <div className="purchase-form-main">
            <section className="purchase-panel purchase-panel-supplier">
              <div className="purchase-panel-head">
                <div className="purchase-panel-icon">S</div>
                <div>
                  <h2>{t.supplierTitle}</h2>
                  <p>{t.supplierSubtitle}</p>
                </div>
              </div>
              <DropdownField label={t.supplierTitle} name="supplierName" value={formState.supplierName} onChange={handleChange} required>
                <option value="">{t.selectSupplier}</option>
                {masterData.supplier.map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </DropdownField>
            </section>

            <section className="purchase-panel purchase-panel-items">
              <div className="purchase-panel-head">
                <div className="purchase-panel-icon purchase-panel-icon-blue">P</div>
                <div>
                  <h2>{t.productTitle}</h2>
                  <p>{t.productSubtitle}</p>
                </div>
              </div>

              <div className="purchase-grid purchase-grid-two purchase-grid-balanced">
                <section className="purchase-image-panel">
                  <div className="purchase-image-copy">
                    <h3>{t.imagePanelTitle}</h3>
                    <p>{t.imagePanelSubtitle}</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="purchase-file-input"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="purchase-image-dropzone purchase-image-dropzone-large"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        width={220}
                        height={220}
                        className="purchase-image-preview"
                      />
                    ) : (
                      <span>{t.image}</span>
                    )}
                  </button>
                </section>

                <div className="purchase-details-stack">
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
                    <DropdownField label={t.categoryName} name="categoryName" value={formState.categoryName} onChange={handleChange} required>
                      <option value="">{t.categoryPlaceholder}</option>
                      {masterData.category.map((option) => (
                        <option key={option.id} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </DropdownField>
                    <DropdownField label={t.brandName} name="brandName" value={formState.brandName} onChange={handleChange}>
                      <option value="">{t.selectBrand}</option>
                      {masterData.brand.map((option) => (
                        <option key={option.id} value={option.name}>
                          {option.name}
                        </option>
                      ))}
                    </DropdownField>
                  </div>

                  <DropdownField label={t.variantName} name="variantName" value={formState.variantName} onChange={handleChange}>
                    <option value="">{t.selectVariant}</option>
                    {masterData.variant.map((option) => (
                      <option key={option.id} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </DropdownField>

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
                        step="0.01"
                        name="unitPrice"
                        value={formState.unitPrice}
                        onChange={handleChange}
                        required
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="purchase-panel purchase-panel-notes">
              <label className="purchase-field-stack">
                <span>{t.notes}</span>
                <textarea
                  className="purchase-textarea"
                  name="notes"
                  value={formState.notes}
                  onChange={handleChange}
                  placeholder={t.notesPlaceholder}
                />
              </label>
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
                    step="0.01"
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
                  <strong>{estimatedTotal.toFixed(2)}</strong>
                </div>

                <div className="purchase-summary-bar purchase-summary-paid">
                  <span>{t.paymentBalance}</span>
                  <strong>{remainingBalance.toFixed(2)}</strong>
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
          <strong>{estimatedTotal.toFixed(2)}</strong>
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
