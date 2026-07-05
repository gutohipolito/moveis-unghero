import { createPwaIcon } from "@/lib/pwaIcon";

export const runtime = "edge";

export async function GET() {
  return createPwaIcon(192);
}
