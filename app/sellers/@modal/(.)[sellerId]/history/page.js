import PurchaseModal from "@/components/purchase/PurchaseModal";
import SellerSalaryHistoryContent from "@/components/sellers/SellerSalaryHistoryContent";

export default async function SellerHistoryModalPage({ params }) {
  const resolvedParams = await params;

  return (
    <PurchaseModal>
      <SellerSalaryHistoryContent sellerId={resolvedParams.sellerId} modal />
    </PurchaseModal>
  );
}
