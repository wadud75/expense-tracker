import PurchaseShell from "@/components/purchase/PurchaseShell";
import HomeOverviewClient from "@/components/home/HomeOverviewClient";
import { getDueManagementSnapshot } from "@/lib/dueManagement";
import { getStockSnapshot } from "@/lib/inventory";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function groupSalesInvoices(rows) {
  return Object.values(
    rows.reduce((summary, sale) => {
      const key = sale.invoiceNo || sale._id.toString();

      if (!summary[key]) {
        summary[key] = {
          invoiceNo: key,
          customerName: sale.customerName || "Walk-in customer",
          total: Number(sale.invoiceTotal ?? sale.lineTotal ?? 0),
          paidAmount: Number(sale.paidAmount ?? sale.invoiceTotal ?? sale.lineTotal ?? 0),
          costTotal: 0,
          profitAmount: 0,
          quantity: 0,
          createdAt: sale.createdAt,
        };
      }

      summary[key].quantity += Number(sale.quantity || 0);
      summary[key].costTotal += Number(sale.costTotal || 0);
      summary[key].profitAmount += Number(sale.profitAmount || 0);
      return summary;
    }, {}),
  );
}

function buildWarrantySummary(rows) {
  const grouped = rows.reduce((summary, sale) => {
    const key = `${sale.invoiceNo || "manual"}::${sale.productName || sale._id.toString()}`;

    if (!summary[key]) {
      summary[key] = {
        createdAt: sale.createdAt,
        warrantyMonths: Math.max(Number(sale.warrantyMonths || 0), 0),
      };
    }

    return summary;
  }, {});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Object.values(grouped).reduce(
    (summary, record) => {
      if (!record.warrantyMonths) {
        return summary;
      }

      const startDate = new Date(record.createdAt);
      if (Number.isNaN(startDate.getTime())) {
        return summary;
      }

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + record.warrantyMonths);
      endDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
      summary.total += 1;

      if (diffDays < 0) {
        summary.expired += 1;
      } else if (diffDays <= 30) {
        summary.expiring += 1;
      } else {
        summary.active += 1;
      }

      return summary;
    },
    { total: 0, active: 0, expiring: 0, expired: 0 },
  );
}

function getTopCategories(products) {
  return [...products.reduce((summary, product) => {
    const key = product.categoryName || "Uncategorized";
    summary.set(key, (summary.get(key) || 0) + 1);
    return summary;
  }, new Map()).entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
}

function buildActivityFeed({ purchases, invoices, movements }) {
  const purchaseItems = purchases.slice(0, 6).map((purchase) => ({
    id: `purchase-${purchase._id}`,
    typeKey: "purchase",
    type: "Purchase",
    title: purchase.productName || "New purchase recorded",
    detail: `${purchase.supplierName || "Supplier"} - ${Number(purchase.quantity || 0)} units`,
    value: formatCurrency(Number(purchase.quantity || 0) * Number(purchase.unitPrice || 0)),
    partyName: purchase.supplierName || "Supplier",
    quantity: Number(purchase.quantity || 0),
    amount: Number(purchase.quantity || 0) * Number(purchase.unitPrice || 0),
    createdAt: purchase.createdAt,
  }));

  const invoiceItems = invoices.slice(0, 6).map((invoice) => ({
    id: `sale-${invoice.invoiceNo}`,
    typeKey: "sale",
    type: "Sale",
    title: invoice.customerName,
    detail: `${invoice.invoiceNo} - ${invoice.quantity} units`,
    value: formatCurrency(invoice.total),
    reference: invoice.invoiceNo,
    quantity: Number(invoice.quantity || 0),
    amount: Number(invoice.total || 0),
    createdAt: invoice.createdAt,
  }));

  const movementItems = movements.slice(0, 6).map((movement) => ({
    id: `movement-${movement.id}`,
    typeKey: "stock",
    type: "Stock",
    title: movement.productName || "Stock movement",
    detail: `${movement.type.replace("_", " ")} adjustment`,
    value: `${movement.quantity > 0 ? "+" : ""}${movement.quantity}`,
    movementLabel: movement.type.replace("_", " "),
    createdAt: movement.createdAt,
  }));

  return [...purchaseItems, ...invoiceItems, ...movementItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

async function getHomeDashboardData() {
  try {
    const client = await clientPromise;
    const db = client.db("expense_tracker");

    const [stockSnapshot, dueSnapshot, salesRows, purchaseRows, customerRows, masterRows] =
      await Promise.all([
        getStockSnapshot(),
        getDueManagementSnapshot(),
        db.collection("sales").find({}).sort({ createdAt: -1 }).toArray(),
        db.collection("purchases").find({}).sort({ createdAt: -1 }).toArray(),
        db.collection("customers").find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray(),
        db.collection("master_data").find({}).sort({ createdAt: -1 }).toArray(),
      ]);

    const invoices = groupSalesInvoices(salesRows);

    return {
      error: "",
      heroUpdatedAt:
        salesRows[0]?.createdAt ||
        purchaseRows[0]?.createdAt ||
        stockSnapshot.recentMovements[0]?.createdAt ||
        null,
      purchases: purchaseRows.map((purchase) => ({
        id: purchase._id.toString(),
        supplierName: purchase.supplierName || "",
        productName: purchase.productName || "",
        quantity: Number(purchase.quantity || 0),
        unitPrice: Number(purchase.unitPrice || 0),
        paymentAmount: Number(purchase.paymentAmount || 0),
        totalAmount: Number(purchase.quantity || 0) * Number(purchase.unitPrice || 0),
        createdAt: purchase.createdAt,
      })),
      invoices,
      customers: {
        total: customerRows.length,
        active: customerRows.filter((customer) => customer.status === "active").length,
      },
      suppliers: {
        total: masterRows.filter((item) => item.type === "supplier").length,
      },
      stockOverview: stockSnapshot.overview,
      dueSummary: dueSnapshot.summary,
      warrantySummary: buildWarrantySummary(salesRows),
      workspaceCards: [
        {
          href: "/admin",
          title: "Admin Dashboard",
          description: "Master data, categories, suppliers, and setup controls.",
          iconKey: "dashboard",
          metric: `${formatNumber(masterRows.length)} records`,
          metricValue: masterRows.length,
        },
        {
          href: "/purchase",
          title: "Purchase",
          description: "Record procurement and push stock into inventory.",
          iconKey: "purchase",
          metric: `${formatNumber(purchaseRows.length)} entries`,
          metricValue: purchaseRows.length,
        },
        {
          href: "/sales",
          title: "Sales / POS",
          description: "Checkout counter, invoice creation, and live selling.",
          iconKey: "sales",
          metric: `${formatNumber(invoices.length)} invoices`,
          metricValue: invoices.length,
        },
        {
          href: "/products",
          title: "Products",
          description: "Pricing, catalog control, and stock health.",
          iconKey: "products",
          metric: `${formatNumber(stockSnapshot.overview.totalProducts || 0)} items`,
          metricValue: stockSnapshot.overview.totalProducts || 0,
        },
        {
          href: "/stock",
          title: "Stock",
          description: "Manual stock adjustment and movement tracking.",
          iconKey: "stock",
          metric: `${formatNumber(stockSnapshot.overview.totalUnits || 0)} units`,
          metricValue: stockSnapshot.overview.totalUnits || 0,
        },
        {
          href: "/customers",
          title: "Customers",
          description: "Profiles, repeat buyers, and follow-up status.",
          iconKey: "customers",
          metric: `${formatNumber(customerRows.length)} profiles`,
          metricValue: customerRows.length,
        },
        {
          href: "/due",
          title: "Due Management",
          description: "Receivable and payable monitoring across the business.",
          iconKey: "due",
          metric: formatCurrency(dueSnapshot.summary.overdueAmount || 0),
          metricValue: dueSnapshot.summary.overdueAmount || 0,
        },
        {
          href: "/warranty",
          title: "Warranty",
          description: "Active, expiring, and manual warranty records.",
          iconKey: "warranty",
          metric: `${formatNumber(buildWarrantySummary(salesRows).expiring || 0)} expiring`,
          metricValue: buildWarrantySummary(salesRows).expiring || 0,
        },
      ],
      activityFeed: buildActivityFeed({
        purchases: purchaseRows,
        invoices,
        movements: stockSnapshot.recentMovements,
      }),
      topCategories: getTopCategories(stockSnapshot.products),
    };
  } catch (error) {
    return {
      error: error.message || "Dashboard data could not be loaded.",
      heroUpdatedAt: null,
      purchases: [],
      invoices: [],
      customers: { total: 0, active: 0 },
      suppliers: { total: 0 },
      stockOverview: { totalValue: 0, totalProducts: 0, totalUnits: 0 },
      dueSummary: { totalReceivable: 0, overdueCount: 0, overdueAmount: 0 },
      warrantySummary: { active: 0, expiring: 0, expired: 0 },
      workspaceCards: [
        {
          href: "/admin",
          title: "Admin Dashboard",
          description: "Open the internal workspace.",
          iconKey: "dashboard",
          metric: "Unavailable",
        },
      ],
      activityFeed: [],
      topCategories: [],
    };
  }
}

export default async function HomePage() {
  const data = await getHomeDashboardData();

  return (
    <PurchaseShell>
      <HomeOverviewClient {...data} />
    </PurchaseShell>
  );
}
