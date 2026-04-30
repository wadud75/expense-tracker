import AlertCircleIcon from "@/components/svgs/AlertCircleIcon";
import AlertTriangleIcon from "@/components/svgs/AlertTriangleIcon";
import BadgeCheckIcon from "@/components/svgs/BadgeCheckIcon";
import BellIcon from "@/components/svgs/BellIcon";
import BoxIcon from "@/components/svgs/BoxIcon";
import CalculatorIcon from "@/components/svgs/CalculatorIcon";
import CalendarIcon from "@/components/svgs/CalendarIcon";
import ChartIcon from "@/components/svgs/ChartIcon";
import CheckIcon from "@/components/svgs/CheckIcon";
import CloseIcon from "@/components/svgs/CloseIcon";
import CustomerIcon from "@/components/svgs/CustomerIcon";
import DashboardIcon from "@/components/svgs/DashboardIcon";
import GlobeIcon from "@/components/svgs/GlobeIcon";
import LedgerIcon from "@/components/svgs/LedgerIcon";
import MenuIcon from "@/components/svgs/MenuIcon";
import MoneyIcon from "@/components/svgs/MoneyIcon";
import PlusIcon from "@/components/svgs/PlusIcon";
import ReceiptIcon from "@/components/svgs/ReceiptIcon";
import RefreshIcon from "@/components/svgs/RefreshIcon";
import ReportIcon from "@/components/svgs/ReportIcon";
import SearchIcon from "@/components/svgs/SearchIcon";
import ShoppingBagIcon from "@/components/svgs/ShoppingBagIcon";
import StackIcon from "@/components/svgs/StackIcon";
import StoreIcon from "@/components/svgs/StoreIcon";
import TakaIcon from "@/components/svgs/TakaIcon";
import WarningIcon from "@/components/svgs/WarningIcon";

export const LANGUAGE_STORAGE_KEY = "expense-tracker-language";
export const SUPPORTED_LANGUAGES = ["en", "bn"];

export const translations = {
  en: {
    languageLabel: "EN",
    shopName: "Power Link",
    menuAriaLabel: "Sidebar menu",
    closeSidebar: "Close sidebar",
    openSidebar: "Open sidebar",
    notifications: "Notifications",
    alertBanner: "Profit-free mode is active today. New expenses are temporarily restricted.",
    refresh: "Refresh",
    reports: "Reports",
    renewNotice:
      "Your subscription has expired. New sales, product updates, and related actions are currently disabled. Renew to continue.",
    renewNow: "Renew",
    pageTitle: "Purchase List",
    pageSubtitle: "Total 0 purchases",
    addPurchase: "New Purchase",
    return: "Return",
    searchPlaceholder: "Search purchases...",
    startDatePlaceholder: "mm/dd/yyyy",
    endDatePlaceholder: "mm/dd/yyyy",
    tableEmpty: "No data available",
    brandTitle: "Power Link",
    brandCode: "Lift & Generator",
    brandStore: "",
    menuItems: [
      "Dashboard",
      "Purchase / Stock Entry",
      "Sales / POS Now",
      "Sales List",
      "Product List",
      "Stock Management",
      "Due Management",
      "Warranty Management",
      "Customer Management",
      "Seller Management",
    ],
    statCards: ["Total Purchases", "Payment Amount", "Units Bought", "Avg Payment"],
    quickFilters: ["Today", "7 Days", "30 Days", "1 Year", "Lifetime"],
    tableHeaders: ["Date", "Invoice", "Supplier", "Product", "Brand", "Variant", "Category", "Qty", "Unit Price", "Payment", "Action"],
    newPurchaseTitle: "New Purchase",
    newPurchaseSubtitle: "Capture a clean purchase record",
    itemsCount: "Ready to save",
    supplierTitle: "Supplier",
    supplierSubtitle: "Record who supplied this product",
    supplierPlaceholder: "Type supplier name",
    imagePanelTitle: "Product Snapshot",
    imagePanelSubtitle: "Upload an image for quick recognition",
    image: "Upload image",
    productTitle: "Product Details",
    productSubtitle: "Keep the item information compact and consistent",
    product: "Product Name",
    productPlaceholder: "Type product name",
    brandName: "Brand",
    brandPlaceholder: "Select brand",
    modelName: "Model",
    modelPlaceholder: "Select model",
    variantName: "Variant",
    variantPlaceholder: "Select variant",
    categoryName: "Category",
    categoryPlaceholder: "Select category",
    selectSupplier: "Select supplier",
    selectBrand: "Select brand",
    selectModel: "Select model",
    selectVariant: "Select variant",
    adminPageTitle: "Admin Dashboard",
    adminPageSubtitle: "Manage categories, suppliers, brands, and variants from one place",
    adminAdd: "Add",
    adminEmpty: "No items yet",
    adminLoading: "Loading...",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    paymentSummary: "Payment",
    paymentSummarySubtitle: "Track how much was paid for this purchase",
    estimatedTotal: "Estimated Total",
    paymentMethod: "Payment Method",
    paymentAmount: "Payment Amount",
    paymentBalance: "Due Amount",
    cash: "Cash",
    notes: "Notes",
    notesPlaceholder: "Write any note about this purchase...",
    cancel: "Cancel",
    saveDraft: "Save Draft",
    save: "Save",
    saving: "Saving...",
    logout: "Logout",
    loggingOut: "Logging out...",
  },
  bn: {
    languageLabel: "বাংলা",
    shopName: "পাওয়ার লিংক",
    menuAriaLabel: "সাইডবার মেনু",
    closeSidebar: "সাইডবার বন্ধ করুন",
    openSidebar: "সাইডবার খুলুন",
    notifications: "নোটিফিকেশন",
    alertBanner: "লাভ ছাড়া মোড আজ সক্রিয় আছে। নতুন খরচ আপাতত সীমিত করা হয়েছে।",
    refresh: "রিফ্রেশ",
    reports: "রিপোর্ট",
    renewNotice:
      "আপনার সাবস্ক্রিপশন মেয়াদ শেষ হয়েছে। নতুন সেলস, পণ্য আপডেট এবং সংশ্লিষ্ট কাজ বন্ধ আছে। চালিয়ে যেতে রিনিউ করুন।",
    renewNow: "রিনিউ",
    pageTitle: "ক্রয় তালিকা",
    pageSubtitle: "মোট ০টি ক্রয়",
    addPurchase: "নতুন ক্রয়",
    return: "ফিরুন",
    searchPlaceholder: "ক্রয় খুঁজুন...",
    startDatePlaceholder: "দিন/মাস/বছর",
    endDatePlaceholder: "দিন/মাস/বছর",
    tableEmpty: "কোনো তথ্য পাওয়া যায়নি",
    brandTitle: "পাওয়ার লিংক",
    brandCode: "লিফট অ্যান্ড জেনারেটর",
    brandStore: "",
    menuItems: [
      "ড্যাশবোর্ড",
      "ক্রয় / স্টক এন্ট্রি",
      "সেলস / পিওএস",
      "সেলস তালিকা",
      "পণ্য তালিকা",
      "স্টক ব্যবস্থাপনা",
      "বকেয়া ব্যবস্থাপনা",
      "ওয়ারেন্টি ব্যবস্থাপনা",
      "গ্রাহক ব্যবস্থাপনা",
      "সেলার ব্যবস্থাপনা",
    ],
    statCards: ["মোট ক্রয়", "পরিশোধ মূল্য", "মোট ইউনিট", "গড় মূল্য"],
    quickFilters: ["আজ", "৭ দিন", "৩০ দিন", "১ বছর", "সর্বমোট"],
    tableHeaders: ["তারিখ", "ইনভয়েস", "সরবরাহকারী", "পণ্য", "ব্র্যান্ড", "ভ্যারিয়েন্ট", "ক্যাটাগরি", "পরিমাণ", "একক মূল্য", "পেমেন্ট", "অ্যাকশন"],
    newPurchaseTitle: "নতুন ক্রয়",
    newPurchaseSubtitle: "পরিপাটি একটি ক্রয় রেকর্ড তৈরি করুন",
    itemsCount: "সেভের জন্য প্রস্তুত",
    supplierTitle: "সরবরাহকারী",
    supplierSubtitle: "কে এই পণ্যটি সরবরাহ করেছে তা লিখুন",
    supplierPlaceholder: "সরবরাহকারীর নাম লিখুন",
    imagePanelTitle: "পণ্যের ছবি",
    imagePanelSubtitle: "দ্রুত চিনতে ছবি আপলোড করুন",
    image: "ছবি আপলোড",
    productTitle: "পণ্যের বিবরণ",
    productSubtitle: "তথ্য সংক্ষিপ্ত ও গুছানো রাখুন",
    product: "পণ্যের নাম",
    productPlaceholder: "পণ্যের নাম লিখুন",
    brandName: "ব্র্যান্ড",
    brandPlaceholder: "ব্র্যান্ড নির্বাচন করুন",
    modelName: "মডেল",
    modelPlaceholder: "মডেল নির্বাচন করুন",
    variantName: "ভ্যারিয়েন্ট",
    variantPlaceholder: "ভ্যারিয়েন্ট নির্বাচন করুন",
    categoryName: "ক্যাটাগরি",
    categoryPlaceholder: "ক্যাটাগরি নির্বাচন করুন",
    selectSupplier: "সরবরাহকারী নির্বাচন করুন",
    selectBrand: "ব্র্যান্ড নির্বাচন করুন",
    selectModel: "মডেল নির্বাচন করুন",
    selectVariant: "ভ্যারিয়েন্ট নির্বাচন করুন",
    adminPageTitle: "অ্যাডমিন ড্যাশবোর্ড",
    adminPageSubtitle: "এক জায়গা থেকে ক্যাটাগরি, সরবরাহকারী, ব্র্যান্ড ও ভ্যারিয়েন্ট ম্যানেজ করুন",
    adminAdd: "যোগ করুন",
    adminEmpty: "এখনও কিছু নেই",
    adminLoading: "লোড হচ্ছে...",
    quantity: "পরিমাণ",
    unitPrice: "একক মূল্য",
    paymentSummary: "পেমেন্ট",
    paymentSummarySubtitle: "এই ক্রয়ের জন্য কত টাকা দেওয়া হয়েছে তা দেখুন",
    estimatedTotal: "আনুমানিক মোট",
    paymentMethod: "পেমেন্ট পদ্ধতি",
    paymentAmount: "পরিশোধিত টাকা",
    paymentBalance: "বকেয়া টাকা",
    cash: "নগদ",
    notes: "নোট",
    notesPlaceholder: "এই ক্রয় সম্পর্কে কোনো নোট লিখুন...",
    cancel: "বাতিল",
    saveDraft: "খসড়া সেভ",
    save: "সেভ",
    saving: "সেভ হচ্ছে...",
  },
};

export const menuConfig = [
  { key: "dashboard", accent: "sidebar-card sidebar-card-sky", icon: DashboardIcon },
  {
    key: "purchase",
    accent: "sidebar-card sidebar-card-mint",
    icon: ShoppingBagIcon,
    active: true,
  },
  { key: "salesPos", accent: "sidebar-card sidebar-card-violet", icon: CalculatorIcon },
  { key: "salesList", accent: "sidebar-card sidebar-card-blue", icon: ReceiptIcon },
  { key: "productList", accent: "sidebar-card sidebar-card-amber", icon: BoxIcon },
  { key: "stock", accent: "sidebar-card sidebar-card-slate", icon: ChartIcon },
  { key: "due", accent: "sidebar-card sidebar-card-rose", icon: MoneyIcon },
  { key: "warranty", accent: "sidebar-card sidebar-card-green", icon: LedgerIcon },
  { key: "customers", accent: "sidebar-card sidebar-card-pink", icon: CustomerIcon },
  { key: "sellers", accent: "sidebar-card sidebar-card-amber", icon: StoreIcon },
];

export const statCardConfig = [
  { key: "count", tone: "stat-card stat-lavender", icon: StackIcon, value: 0 },
  { key: "payments", tone: "stat-card stat-sky", icon: TakaIcon, value: 0 },
  { key: "units", tone: "stat-card stat-green", icon: CheckIcon, value: 0 },
  { key: "average", tone: "stat-card stat-rose", icon: AlertCircleIcon, value: 0 },
];

export const purchaseIcons = {
  AlertCircleIcon,
  AlertTriangleIcon,
  BadgeCheckIcon,
  BellIcon,
  CalendarIcon,
  CloseIcon,
  GlobeIcon,
  MenuIcon,
  PlusIcon,
  RefreshIcon,
  ReportIcon,
  SearchIcon,
  StackIcon,
  StoreIcon,
  TakaIcon,
  WarningIcon,
  CheckIcon,
};

export function detectLanguage() {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage)) {
    return storedLanguage;
  }

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const matchedLanguage = browserLanguages
    .map((language) => language?.toLowerCase().split("-")[0])
    .find((language) => SUPPORTED_LANGUAGES.includes(language));

  return matchedLanguage || "en";
}
