import { NextRequest, NextResponse } from "next/server";

import { getCatalogStats, getCatalogToolkits } from "@/lib/catalog";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const [toolkits, stats] = await Promise.all([
    getCatalogToolkits({
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      managedOnly: searchParams.get("managedOnly") === "true",
    }),
    getCatalogStats(),
  ]);
  return NextResponse.json({ toolkits, stats });
}
