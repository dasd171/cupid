import { NextResponse } from "next/server";
import { activeModelName, activeProviderName } from "@/lib/ai/factory";

/** Liveness check. Never exposes secrets or user data. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    provider: activeProviderName(),
    model: activeModelName(),
    time: new Date().toISOString(),
  });
}
