"use client";

import { useRouter } from "next/navigation";

export default function PurchaseModal({ children }) {
  const router = useRouter();

  return (
    <div className="route-modal-overlay" onClick={() => router.back()}>
      <div
        className="route-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-label="New Purchase"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
