import PurchaseModal from "@/components/purchase/PurchaseModal";
import NewPurchaseScreen from "@/components/purchase/NewPurchaseScreen";

export default function NewPurchaseModalPage() {
  return (
    <PurchaseModal>
      <NewPurchaseScreen modal />
    </PurchaseModal>
  );
}
