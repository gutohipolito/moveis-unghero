import { NextResponse } from "next/server";

/** Endpoint legado GEO — agora aponta o manifesto curto. */
export async function GET() {
  return NextResponse.redirect(new URL("/llms.txt", "https://moveisunghero.com.br"), 301);
}
