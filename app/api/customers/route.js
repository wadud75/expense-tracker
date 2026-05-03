import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAdminRequest } from "@/lib/server-auth";

function normalizeText(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function normalizePhone(value) {
  return (value || "").replace(/[^\d+]/g, "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function toCustomerPayload(customer) {
  return {
    id: customer._id.toString(),
    name: customer.name || "",
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    segment: customer.segment || "retail",
    status: customer.status || "active",
    notes: customer.notes || "",
    createdAt: customer.createdAt || null,
    updatedAt: customer.updatedAt || null,
  };
}

async function getCollection() {
  const client = await clientPromise;
  return client.db("expense_tracker").collection("customers");
}

async function findDuplicateCustomer(collection, { normalizedName, normalizedPhone, normalizedEmail, excludeId }) {
  const clauses = [];

  if (normalizedEmail) {
    clauses.push({ normalizedEmail });
  }

  if (normalizedName && normalizedPhone) {
    clauses.push({ normalizedName, normalizedPhone });
  }

  if (!clauses.length) {
    return null;
  }

  const query = { $or: clauses };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return collection.findOne(query);
}

export async function GET() {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const collection = await getCollection();
    const customers = await collection.find({}).sort({ createdAt: 1, updatedAt: 1 }).toArray();

    return NextResponse.json({
      customers: customers.map(toCustomerPayload),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load customers." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const name = normalizeText(payload.name);
    const phone = normalizePhone(payload.phone);
    const email = normalizeEmail(payload.email);
    const address = normalizeText(payload.address);
    const segment = normalizeText(payload.segment).toLowerCase() || "retail";
    const status = normalizeText(payload.status).toLowerCase() || "active";
    const notes = normalizeText(payload.notes);

    if (!name) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Provide at least a phone number or email address." },
        { status: 400 },
      );
    }

    const collection = await getCollection();
    const duplicate = await findDuplicateCustomer(collection, {
      normalizedName: name.toLowerCase(),
      normalizedPhone: phone,
      normalizedEmail: email,
    });

    if (duplicate) {
      return NextResponse.json({ error: "A matching customer already exists." }, { status: 409 });
    }

    const now = new Date();
    const document = {
      name,
      normalizedName: name.toLowerCase(),
      phone,
      normalizedPhone: phone,
      email,
      normalizedEmail: email,
      address,
      segment,
      status,
      notes,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(document);

    return NextResponse.json({
      customer: toCustomerPayload({ ...document, _id: result.insertedId }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create customer." },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const id = normalizeText(payload.id);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer." }, { status: 400 });
    }

    const objectId = new ObjectId(id);
    const name = normalizeText(payload.name);
    const phone = normalizePhone(payload.phone);
    const email = normalizeEmail(payload.email);
    const address = normalizeText(payload.address);
    const segment = normalizeText(payload.segment).toLowerCase() || "retail";
    const status = normalizeText(payload.status).toLowerCase() || "active";
    const notes = normalizeText(payload.notes);

    if (!name) {
      return NextResponse.json({ error: "Customer name is required." }, { status: 400 });
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Provide at least a phone number or email address." },
        { status: 400 },
      );
    }

    const collection = await getCollection();
    const duplicate = await findDuplicateCustomer(collection, {
      normalizedName: name.toLowerCase(),
      normalizedPhone: phone,
      normalizedEmail: email,
      excludeId: objectId,
    });

    if (duplicate) {
      return NextResponse.json({ error: "A matching customer already exists." }, { status: 409 });
    }

    const update = {
      name,
      normalizedName: name.toLowerCase(),
      phone,
      normalizedPhone: phone,
      email,
      normalizedEmail: email,
      address,
      segment,
      status,
      notes,
      updatedAt: new Date(),
    };

    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: update },
      { returnDocument: "after" },
    );

    if (!result) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({ customer: toCustomerPayload(result) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update customer." },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const unauthorizedResponse = await requireAdminRequest();
    if (unauthorizedResponse) return unauthorizedResponse;

    const payload = await request.json();
    const id = normalizeText(payload.id);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer." }, { status: 400 });
    }

    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete customer." },
      { status: 500 },
    );
  }
}
