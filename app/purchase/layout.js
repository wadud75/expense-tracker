import PurchaseShell from "@/components/purchase/PurchaseShell";

export default function PurchaseLayout({ children, modal }) {
  return (
    <>
      <PurchaseShell>{children}</PurchaseShell>
      {modal}
    </>
  );
}
