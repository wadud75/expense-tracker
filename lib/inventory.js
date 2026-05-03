import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { createInvoiceNumber } from "@/lib/invoiceUtils";

function normalizeText(value) {
  return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function buildProductSignature(fields) {
  return [fields.categoryName, fields.brandName, fields.variantName]
    .map((value) => normalizeText(value).toLowerCase())
    .join("::");
}

function buildProductName(fields) {
  return [fields.productName, fields.brandName, fields.modelName, fields.variantName]
    .map(normalizeText)
    .filter(Boolean)
    .join(" - ");
}

export async function getDb() {
  const client = await clientPromise;
  return client.db("expense_tracker");
}

export async function getCollections() {
  const db = await getDb();
  return {
    db,
    products: db.collection("products"),
    stockMovements: db.collection("stock_movements"),
    sales: db.collection("sales"),
    masterData: db.collection("master_data"),
  };
}

export async function upsertProductFromPurchase(purchase, purchaseId) {
  const { products, stockMovements } = await getCollections();
  const now = new Date();
  const quantity = normalizeNumber(purchase.quantity, 0);
  const unitPrice = normalizeNumber(purchase.unitPrice, 0);
  const signature = buildProductSignature(purchase);

  let product = await products.findOne({ signature });

  if (!product) {
    const newProduct = {
      signature,
      productName: normalizeText(purchase.productName),
      displayName: buildProductName(purchase),
      categoryName: normalizeText(purchase.categoryName),
      brandName: normalizeText(purchase.brandName),
      modelName: normalizeText(purchase.modelName),
      variantName: normalizeText(purchase.variantName),
      supplierName: normalizeText(purchase.supplierName),
      unitPrice,
      currentStock: quantity,
      createdAt: now,
      updatedAt: now,
    };

    const result = await products.insertOne(newProduct);
    product = { ...newProduct, _id: result.insertedId };
  } else {
    await products.updateOne(
      { _id: product._id },
      {
        $inc: { currentStock: quantity },
        $set: {
          productName: normalizeText(purchase.productName),
          displayName: buildProductName(purchase),
          categoryName: normalizeText(purchase.categoryName),
          brandName: normalizeText(purchase.brandName),
          modelName: normalizeText(purchase.modelName),
          variantName: normalizeText(purchase.variantName),
          supplierName: normalizeText(purchase.supplierName),
          unitPrice,
          updatedAt: now,
        },
      },
    );

    product.currentStock += quantity;
  }

  await stockMovements.insertOne({
    productId: product._id,
    productName: product.displayName,
    type: "purchase",
    quantity,
    referenceId: purchaseId,
    referenceType: "purchase",
    note: normalizeText(purchase.notes),
    createdAt: now,
  });

  return product;
}

export async function createSalesBatch({
  items,
  customerName = "",
  customerAddress = "",
  customerPhone = "",
  sellerName = "",
  paymentMethod = "Cash",
  paymentAccount = "Cash",
  paidAmount = 0,
  invoiceTotal,
  dueDate,
  warrantyMonths = 0,
  note = "",
}) {
  const { products, stockMovements, sales, masterData } = await getCollections();
  const now = new Date();
  const normalizedItems = Array.isArray(items)
    ? items
        .map((item) => ({
          productId: item?.productId,
          quantity: normalizeNumber(item?.quantity, 0),
          unitPrice: normalizeNumber(item?.unitPrice, 0),
          lineTotal: normalizeNumber(item?.lineTotal, 0),
          atsMode: normalizeText(item?.atsMode),
        }))
        .filter((item) => item.productId)
    : [];

  if (!normalizedItems.length) {
    throw new Error("At least one sale item is required.");
  }

  const objectIds = normalizedItems.map((item) => {
    if (!ObjectId.isValid(item.productId)) {
      throw new Error("Invalid product.");
    }

    if (item.quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    return new ObjectId(item.productId);
  });

  const productRows = await products.find({ _id: { $in: objectIds } }).toArray();
  const productMap = productRows.reduce((summary, product) => {
    summary[product._id.toString()] = product;
    return summary;
  }, {});

  const invoiceNo = createInvoiceNumber("SL", now);
  const calculatedInvoiceTotal = normalizedItems.reduce(
    (total, item) => total + (item.lineTotal || item.quantity * item.unitPrice),
    0,
  );
  const normalizedInvoiceTotal = normalizeNumber(invoiceTotal, calculatedInvoiceTotal);
  const paidValue = normalizeNumber(paidAmount, normalizedInvoiceTotal);
  const normalizedCustomerName = normalizeText(customerName);
  const normalizedCustomerAddress = normalizeText(customerAddress);
  const normalizedCustomerPhone = normalizeText(customerPhone);
  const normalizedSellerName = normalizeText(sellerName);
  const normalizedPaymentMethod = normalizeText(paymentMethod) || "Cash";
  const normalizedPaymentAccount = normalizeText(paymentAccount) || "Cash";
  const normalizedDueDate = normalizeDate(dueDate, now);
  const normalizedWarrantyMonths = Math.max(normalizeNumber(warrantyMonths, 0), 0);
  const normalizedNote = normalizeText(note);

  for (const item of normalizedItems) {
    const product = productMap[item.productId];

    if (!product) {
      throw new Error("Product not found.");
    }

    if ((product.currentStock || 0) < item.quantity) {
      throw new Error(`${product.displayName} does not have enough stock.`);
    }
  }

  const insertedSales = [];

  for (const item of normalizedItems) {
    const product = productMap[item.productId];
    const lineTotal = item.lineTotal || item.quantity * item.unitPrice;
    const unitPrice = item.quantity > 0 ? lineTotal / item.quantity : item.unitPrice;
    const costUnitPrice = normalizeNumber(product.unitPrice, 0);
    const costTotal = costUnitPrice * item.quantity;
    const profitAmount = lineTotal - costTotal;
    const updateResult = await products.updateOne(
      { _id: product._id, currentStock: { $gte: item.quantity } },
      {
        $inc: { currentStock: -item.quantity },
        $set: { updatedAt: now },
      },
    );

    if (!updateResult.modifiedCount) {
      throw new Error(`Failed to update stock for ${product.displayName}.`);
    }

    const remainingStock = (product.currentStock || 0) - item.quantity;
    product.currentStock = remainingStock;

    const saleDocument = {
      invoiceNo,
      productId: product._id,
      productName: product.displayName,
      customerName: normalizedCustomerName,
      customerAddress: normalizedCustomerAddress,
      customerPhone: normalizedCustomerPhone,
      sellerName: normalizedSellerName,
      quantity: item.quantity,
      unitPrice,
      costUnitPrice,
      costTotal,
      lineTotal,
      profitAmount,
      invoiceTotal: normalizedInvoiceTotal,
      paymentMethod: normalizedPaymentMethod,
      paymentAccount: normalizedPaymentAccount,
      paidAmount: paidValue,
      dueDate: normalizedDueDate,
      warrantyMonths: normalizedWarrantyMonths,
      atsMode: item.atsMode || "",
      note: normalizedNote,
      createdAt: now,
    };

    const insertResult = await sales.insertOne(saleDocument);

    await stockMovements.insertOne({
      productId: product._id,
      productName: product.displayName,
      type: "sale",
      quantity: -item.quantity,
      referenceId: insertResult.insertedId,
      referenceType: "sale",
      note: normalizedNote,
      createdAt: now,
    });

    insertedSales.push({
      id: insertResult.insertedId.toString(),
      invoiceNo,
      productId: item.productId,
      productName: product.displayName,
      customerName: normalizedCustomerName,
      customerAddress: normalizedCustomerAddress,
      customerPhone: normalizedCustomerPhone,
      sellerName: normalizedSellerName,
      quantity: item.quantity,
      unitPrice,
      costUnitPrice,
      costTotal,
      lineTotal,
      profitAmount,
      invoiceTotal: normalizedInvoiceTotal,
      paymentMethod: normalizedPaymentMethod,
      paymentAccount: normalizedPaymentAccount,
      paidAmount: paidValue,
      dueDate: normalizedDueDate,
      warrantyMonths: normalizedWarrantyMonths,
      atsMode: item.atsMode || "",
      note: normalizedNote,
      createdAt: now,
      remainingStock,
    });
  }

  if (paidValue > 0) {
    const capitalName = `Sales Payment ${invoiceNo}`;
    await masterData.insertOne({
      type: "capital",
      name: capitalName,
      normalizedName: capitalName.toLowerCase(),
      amount: paidValue,
      note: normalizedNote || `Payment received from invoice ${invoiceNo}`,
      account: normalizedPaymentAccount,
      paymentMethod: normalizedPaymentMethod,
      sourceType: "sale",
      sourceId: invoiceNo,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    invoiceNo,
    sales: insertedSales,
  };
}

export async function createSale({ productId, quantity, unitPrice = 0, note = "" }) {
  const result = await createSalesBatch({
    note,
    items: [{ productId, quantity, unitPrice, lineTotal: quantity * unitPrice }],
  });

  return result.sales[0];
}

export async function getSalesRecords() {
  const { sales } = await getCollections();
  const rows = await sales.find({}).sort({ createdAt: 1 }).limit(300).toArray();

  return rows.map((sale) => ({
    id: sale._id.toString(),
    invoiceNo: sale.invoiceNo || "",
    productId: sale.productId?.toString?.() || "",
    productName: sale.productName || "",
    customerName: sale.customerName || "",
    customerAddress: sale.customerAddress || "",
    customerPhone: sale.customerPhone || "",
    sellerName: sale.sellerName || "",
    quantity: sale.quantity || 0,
    unitPrice: sale.unitPrice || 0,
    costUnitPrice: sale.costUnitPrice || 0,
    costTotal: sale.costTotal || 0,
    lineTotal: sale.lineTotal ?? sale.totalAmount ?? 0,
    profitAmount: sale.profitAmount ?? ((sale.lineTotal ?? sale.totalAmount ?? 0) - (sale.costTotal ?? 0)),
    invoiceTotal: sale.invoiceTotal ?? sale.totalAmount ?? 0,
    paymentMethod: sale.paymentMethod || "Cash",
    paymentAccount: sale.paymentAccount || "Cash",
    paidAmount: sale.paidAmount ?? sale.totalAmount ?? 0,
    dueDate: sale.dueDate || sale.createdAt,
    warrantyMonths: sale.warrantyMonths ?? 0,
    atsMode: sale.atsMode || "",
    note: sale.note || "",
    createdAt: sale.createdAt,
  }));
}

export async function updateSalesWarrantyRecords({
  saleIds,
  customerName = "",
  productName = "",
  invoiceNo = "",
  purchaseDate,
  warrantyMonths = 0,
  note = "",
}) {
  const { sales } = await getCollections();

  const normalizedSaleIds = Array.isArray(saleIds)
    ? saleIds.filter((saleId) => ObjectId.isValid(saleId)).map((saleId) => new ObjectId(saleId))
    : [];

  if (!normalizedSaleIds.length) {
    throw new Error("At least one valid sale record is required.");
  }

  const normalizedCustomerName = normalizeText(customerName);
  const normalizedProductName = normalizeText(productName);
  const normalizedInvoiceNo = normalizeText(invoiceNo);
  const normalizedWarrantyMonths = Math.max(normalizeNumber(warrantyMonths, 0), 0);
  const normalizedNote = normalizeText(note);
  const parsedPurchaseDate = new Date(purchaseDate);

  if (!normalizedCustomerName || !normalizedProductName || !purchaseDate) {
    throw new Error("Customer, product, and purchase date are required.");
  }

  if (Number.isNaN(parsedPurchaseDate.getTime())) {
    throw new Error("Purchase date is invalid.");
  }

  const updateResult = await sales.updateMany(
    { _id: { $in: normalizedSaleIds } },
    {
      $set: {
        customerName: normalizedCustomerName,
        productName: normalizedProductName,
        invoiceNo: normalizedInvoiceNo || "Manual",
        createdAt: parsedPurchaseDate,
        warrantyMonths: normalizedWarrantyMonths,
        note: normalizedNote,
      },
    },
  );

  if (!updateResult.matchedCount) {
    throw new Error("The selected sale warranty record could not be found.");
  }

  return {
    matchedCount: updateResult.matchedCount,
    modifiedCount: updateResult.modifiedCount,
  };
}

export async function adjustStock({ productId, quantity, direction, note = "" }) {
  const { products, stockMovements } = await getCollections();
  const now = new Date();
  const parsedQuantity = normalizeNumber(quantity, 0);

  if (!ObjectId.isValid(productId)) {
    throw new Error("Invalid product.");
  }

  if (parsedQuantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const objectId = new ObjectId(productId);
  const product = await products.findOne({ _id: objectId });

  if (!product) {
    throw new Error("Product not found.");
  }

  const delta = direction === "out" ? -parsedQuantity : parsedQuantity;

  if (direction === "out" && (product.currentStock || 0) < parsedQuantity) {
    throw new Error("Stock cannot go below zero.");
  }

  await products.updateOne(
    { _id: objectId },
    {
      $inc: { currentStock: delta },
      $set: { updatedAt: now },
    },
  );

  await stockMovements.insertOne({
    productId: objectId,
    productName: product.displayName,
    type: direction === "out" ? "manual_out" : "manual_in",
    quantity: delta,
    referenceId: objectId,
    referenceType: "stock_adjustment",
    note: normalizeText(note),
    createdAt: now,
  });
}

export async function updateProduct({ productId, productName, categoryName, brandName, variantName, supplierName, unitPrice }) {
  const { products, stockMovements, sales } = await getCollections();
  const now = new Date();

  if (!ObjectId.isValid(productId)) {
    throw new Error("Invalid product.");
  }

  const objectId = new ObjectId(productId);
  const existingProduct = await products.findOne({ _id: objectId });

  if (!existingProduct) {
    throw new Error("Product not found.");
  }

  const nextFields = {
    productName: normalizeText(productName),
    categoryName: normalizeText(categoryName),
    brandName: normalizeText(brandName),
    variantName: normalizeText(variantName),
    supplierName: normalizeText(supplierName),
  };

  if (!nextFields.productName) {
    throw new Error("Product name is required.");
  }

  const nextUnitPrice = normalizeNumber(unitPrice, 0);
  if (nextUnitPrice < 0) {
    throw new Error("Unit price cannot be negative.");
  }

  const signature = buildProductSignature(nextFields);
  const duplicateProduct = await products.findOne({ signature, _id: { $ne: objectId } });

  if (duplicateProduct) {
    throw new Error("Another product already uses this category, brand, and variant combination.");
  }

  const displayName = buildProductName(nextFields);

  await products.updateOne(
    { _id: objectId },
    {
      $set: {
        ...nextFields,
        signature,
        displayName,
        unitPrice: nextUnitPrice,
        updatedAt: now,
      },
    },
  );

  await stockMovements.updateMany(
    { productId: objectId },
    {
      $set: {
        productName: displayName,
      },
    },
  );

  await sales.updateMany(
    { productId: objectId },
    {
      $set: {
        productName: displayName,
      },
    },
  );
}

export async function deleteProduct(productId) {
  const { products, stockMovements, sales } = await getCollections();

  if (!ObjectId.isValid(productId)) {
    throw new Error("Invalid product.");
  }

  const objectId = new ObjectId(productId);
  const existingProduct = await products.findOne({ _id: objectId });

  if (!existingProduct) {
    throw new Error("Product not found.");
  }

  await stockMovements.deleteMany({ productId: objectId });
  await sales.deleteMany({ productId: objectId });
  await products.deleteOne({ _id: objectId });
}

export async function getStockSnapshot() {
  const { products, stockMovements } = await getCollections();
  const productRows = await products.find({}).sort({ createdAt: 1, updatedAt: 1 }).toArray();
  const recentMovements = await stockMovements.find({}).sort({ createdAt: 1 }).limit(20).toArray();

  const overview = productRows.reduce(
    (summary, product) => {
      const stock = Number(product.currentStock) || 0;
      summary.totalProducts += 1;
      summary.totalUnits += stock;
      summary.totalValue += stock * (Number(product.unitPrice) || 0);

      if (stock <= 0) {
        summary.outOfStock += 1;
      } else if (stock <= 5) {
        summary.lowStock += 1;
      } else {
        summary.inStock += 1;
      }

      return summary;
    },
    { totalProducts: 0, totalUnits: 0, totalValue: 0, inStock: 0, lowStock: 0, outOfStock: 0 },
  );

  return {
    overview,
    products: productRows.map((product) => ({
      id: product._id.toString(),
      productName: product.productName,
      displayName: product.displayName,
      categoryName: product.categoryName || "",
      brandName: product.brandName || "",
      variantName: product.variantName || "",
      supplierName: product.supplierName || "",
      currentStock: product.currentStock || 0,
      unitPrice: product.unitPrice || 0,
      updatedAt: product.updatedAt,
    })),
    recentMovements: recentMovements.map((movement) => ({
      id: movement._id.toString(),
      productId: movement.productId?.toString?.() || "",
      productName: movement.productName,
      type: movement.type,
      quantity: movement.quantity,
      note: movement.note || "",
      createdAt: movement.createdAt,
    })),
  };
}
