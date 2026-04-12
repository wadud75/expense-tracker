import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminRequest } from "@/lib/server-auth";

const MASTER_DATA_TYPES = ["category", "supplier", "brand", "model", "variant", "seller"];

function normalizeName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
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

      grouped[entry.type].push({
        id: entry._id.toString(),
        name: entry.name,
        type: entry.type,
      });
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

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const normalizedName = name.toLowerCase();
    const collection = await getCollection();
    const existing = await collection.findOne({ type, normalizedName });

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

    const document = {
      type,
      name,
      normalizedName,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(document);

    return NextResponse.json({
      item: {
        id: result.insertedId.toString(),
        name,
        type,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save master data." },
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
