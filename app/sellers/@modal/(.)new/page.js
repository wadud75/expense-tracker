import PurchaseModal from "@/components/purchase/PurchaseModal";
import SellerProfileScreen from "@/components/sellers/SellerProfileScreen";

export default function NewSellerModalPage() {
  return (
    <PurchaseModal>
      <SellerProfileScreen modal />
    </PurchaseModal>
  );
}
