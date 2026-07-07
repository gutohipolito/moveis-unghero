import { NextResponse } from "next/server";
import { GOOGLE_REVIEW_URL } from "@/lib/google-review";

export function GET() {
  return NextResponse.redirect(GOOGLE_REVIEW_URL, 302);
}
