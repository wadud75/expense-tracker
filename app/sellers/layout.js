import PurchaseShell from "@/components/purchase/PurchaseShell";

export default function SellersLayout({ children, modal }) {
  return (
    <>
      <PurchaseShell>{children}</PurchaseShell>
      {modal}
    </>
  );
}
