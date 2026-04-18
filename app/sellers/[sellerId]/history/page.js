import SellerSalaryHistoryContent from "@/components/sellers/SellerSalaryHistoryContent";

export default async function SellerHistoryPage({ params }) {
  const resolvedParams = await params;

  return <SellerSalaryHistoryContent sellerId={resolvedParams.sellerId} />;
}
