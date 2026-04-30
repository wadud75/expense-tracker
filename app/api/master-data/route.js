import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminRequest } from "@/lib/server-auth";

const MASTER_DATA_TYPES = ["category", "supplier", "brand", "model", "variant", "bank", "seller", "capital"];
const SELLER_ROLES = ["sales executive", "manager", "cashier", "support", "owner", "other"];
const SELLER_STATUSES = ["active", "inactive", "on-leave"];
const SALARY_PAYMENT_ACTIONS = ["pay", "unpay"];

function normalizeName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function normalizeText(value) {
  return (value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return normalizeText(value).replace(/\s+/g, " ");
}

function normalizeRole(value) {
  const normalized = normalizeText(value).toLowerCase();
  return SELLER_ROLES.includes(normalized) ? normalized : "other";
}

function normalizeStatus(value) {
  const normalized = normalizeText(value).toLowerCase();
  return SELLER_STATUSES.includes(normalized) ? normalized : "active";
}

function normalizeSalary(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMonthKey(value) {
  const normalized = normalizeText(value);
  return /^\d{4}-\d{2}$/.test(normalized) ? normalized : "";
}

function mapSalaryPayments(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      const monthKey = normalizeMonthKey(entry?.monthKey);

      if (!monthKey) {
        return null;
      }

      return {
        monthKey,
        amount: normalizeSalary(entry?.amount ?? 0),
        paidAt: entry?.paidAt ? new Date(entry.paidAt) : null,
        note: normalizeText(entry?.note ?? ""),
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.monthKey.localeCompare(left.monthKey));
}

function mapEntry(entry) {
  const baseItem = {
    id: entry._id.toString(),
    name: entry.name,
    type: entry.type,
  };

  if (entry.type === "capital") {
    return {
      ...baseItem,
      amount: normalizeAmount(entry.amount || 0),
      note: entry.note || "",
      account: entry.account || "cash",
      createdAt: entry.createdAt || null,
      updatedAt: entry.updatedAt || null,
    };
  }

  if (entry.type !== "seller") {
    return baseItem;
  }

  return {
    ...baseItem,
    email: entry.email || "",
    phone: entry.phone || "",
    address: entry.address || "",
    role: entry.role || "other",
    salary: Number(entry.salary || 0),
    status: entry.status || "active",
    notes: entry.notes || "",
    salaryPayments: mapSalaryPayments(entry.salaryPayments),
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
  };
}

function buildCapitalDocument(payload, existing = {}) {
  const amount = normalizeAmount(payload.amount ?? existing.amount ?? 0);
  const note = normalizeText(payload.note ?? existing.note ?? "");
  const account = normalizeText(payload.account ?? existing.account ?? "cash") || "cash";
  const name = normalizeName(
    payload.name ||
      existing.name ||
      `${amount >= 0 ? "Capital Added" : "Capital Reduced"} ${Math.abs(amount)}`,
  );

  return {
    name,
    normalizedName: name.toLowerCase(),
    amount,
    note,
    account,
  };
}

function buildSellerDocument(payload, existing = {}) {
  return {
    name: normalizeName(payload.name || existing.name || ""),
    normalizedName: normalizeName(payload.name || existing.name || "").toLowerCase(),
    email: normalizeEmail(payload.email ?? existing.email ?? ""),
    phone: normalizePhone(payload.phone ?? existing.phone ?? ""),
    address: normalizeText(payload.address ?? existing.address ?? ""),
    role: normalizeRole(payload.role ?? existing.role ?? "other"),
    salary: normalizeSalary(payload.salary ?? existing.salary ?? 0),
    status: normalizeStatus(payload.status ?? existing.status ?? "active"),
    notes: normalizeText(payload.notes ?? existing.notes ?? ""),
    salaryPayments: mapSalaryPayments(existing.salaryPayments),
  };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db("expense_tracker").collection("master_data");
}

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const collection = await getCollection();
    const entries = await collection.find({}).sort({ type: 1, name: 1 }).toArray();

    const grouped = MASTER_DATA_TYPES.reduce((summary, type) => {
      summary[type] = [];
      return summary;
    }, {});

    entries.forEach((entry) => {
      if (!grouped[entry.type]) {
        grouped[entry.type] = [];
      }

      grouped[entry.type].push(mapEntry(entry));
    });

    return NextResponse.json({
      items: grouped,
      counts: Object.fromEntries(MASTER_DATA_TYPES.map((type) => [type, grouped[type]?.length || 0])),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load master data." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const type = (payload.type || "").trim().toLowerCase();
    const name = normalizeName(payload.name);

    if (!MASTER_DATA_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid master data type." }, { status: 400 });
    }

    if (type !== "capital" && !name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const collection = await getCollection();
    const normalizedName = name.toLowerCase();
    const existing =
      type === "capital" ? null : await collection.findOne({ type, normalizedName });

    if (existing) {
      return NextResponse.json(
        {
          error: "This item already exists.",
          item: {
            id: existing._id.toString(),
            name: existing.name,
            type: existing.type,
          },
        },
        { status: 409 },
      );
    }

    const document =
      type === "seller"
        ? {
            type,
            ...buildSellerDocument(payload),
            createdAt: new Date(),
          }
        : type === "capital"
          ? {
              type,
              ...buildCapitalDocument(payload),
              createdAt: new Date(),
            }
        : {
            type,
            name,
            normalizedName,
            createdAt: new Date(),
          };

    const result = await collection.insertOne(document);

    return NextResponse.json({
      item: mapEntry({ ...document, _id: result.insertedId }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save master data." },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const type = (payload.type || "").trim().toLowerCase();
    const itemId = (payload.id || "").trim();
    const name = normalizeName(payload.name);

    if (!MASTER_DATA_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid master data type." }, { status: 400 });
    }

    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    }

    if (type !== "capital" && !name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const collection = await getCollection();
    const objectId = new ObjectId(itemId);
    const existing = await collection.findOne({ _id: objectId, type });

    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const normalizedName = name.toLowerCase();
    const duplicate =
      type === "capital"
        ? null
        : await collection.findOne({
            _id: { $ne: objectId },
            type,
            normalizedName,
          });

    if (duplicate) {
      return NextResponse.json(
        {
          error: "This item already exists.",
          item: {
            id: duplicate._id.toString(),
            name: duplicate.name,
            type: duplicate.type,
          },
        },
        { status: 409 },
      );
    }

    const nextFields =
      type === "seller"
        ? {
            ...buildSellerDocument(payload, existing),
            updatedAt: new Date(),
          }
        : type === "capital"
          ? {
              ...buildCapitalDocument(payload, existing),
              updatedAt: new Date(),
            }
        : {
            name,
            normalizedName,
            updatedAt: new Date(),
          };

    await collection.updateOne(
      { _id: objectId, type },
      {
        $set: nextFields,
      },
    );

    if (type === "seller" && existing.name !== name) {
      const client = await clientPromise;
      await client.db("expense_tracker").collection("sales").updateMany(
        { sellerName: existing.name },
        {
          $set: {
            sellerName: name,
          },
        },
      );
    }

    return NextResponse.json({
      item: mapEntry({ ...existing, ...nextFields, _id: objectId }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update master data." },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const type = (payload.type || "").trim().toLowerCase();
    const itemId = (payload.id || "").trim();

    if (!MASTER_DATA_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid master data type." }, { status: 400 });
    }

    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item." }, { status: 400 });
    }

    const collection = await getCollection();
    const result = await collection.deleteOne({
      _id: new ObjectId(itemId),
      type,
    });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: itemId, type });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete master data." },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const type = (payload.type || "").trim().toLowerCase();
    const itemId = (payload.id || "").trim();
    const action = normalizeText(payload.action).toLowerCase();
    const monthKey = normalizeMonthKey(payload.monthKey);

    if (type !== "seller") {
      return NextResponse.json({ error: "Salary actions are only supported for sellers." }, { status: 400 });
    }

    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid seller." }, { status: 400 });
    }

    if (!SALARY_PAYMENT_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid salary payment action." }, { status: 400 });
    }

    if (!monthKey) {
      return NextResponse.json({ error: "Invalid payment month." }, { status: 400 });
    }

    const collection = await getCollection();
    const objectId = new ObjectId(itemId);
    const existing = await collection.findOne({ _id: objectId, type });

    if (!existing) {
      return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    }

    const salaryPayments = mapSalaryPayments(existing.salaryPayments);
    const nextSalaryPayments =
      action === "pay"
        ? [
            {
              monthKey,
              amount: normalizeSalary(payload.amount ?? existing.salary ?? 0),
              paidAt: new Date(),
              note: normalizeText(payload.note ?? ""),
            },
            ...salaryPayments.filter((entry) => entry.monthKey !== monthKey),
          ].sort((left, right) => right.monthKey.localeCompare(left.monthKey))
        : salaryPayments.filter((entry) => entry.monthKey !== monthKey);

    const nextFields = {
      salaryPayments: nextSalaryPayments,
      updatedAt: new Date(),
    };

    await collection.updateOne(
      { _id: objectId, type },
      {
        $set: nextFields,
      },
    );

    return NextResponse.json({
      item: mapEntry({ ...existing, ...nextFields, _id: objectId }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update seller salary payment." },
      { status: 500 },
    );
  }
}
