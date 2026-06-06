import { NextResponse } from "next/server";
import { getDemoOpportunities } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const opportunities = getDemoOpportunities();

    return NextResponse.json({
      data: opportunities,
      count: opportunities.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 },
    );
  }
}
