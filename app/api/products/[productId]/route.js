import { NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/inventory";

export async function PUT(request, context) {
  try {
    const { productId } = await context.params;
    const body = await request.json();

    await updateProduct({
      productId,
      productName: body.productName,
      categoryName: body.categoryName,
      brandName: body.brandName,
      variantName: body.variantName,
      supplierName: body.supplierName,
      unitPrice: body.unitPrice,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update product." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const { productId } = await context.params;
    await deleteProduct(productId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete product." },
      { status: 400 },
    );
  }
}