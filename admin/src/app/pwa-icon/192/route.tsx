import { createPwaIcon } from "@/lib/pwaIcon";

export async function GET() {
  return createPwaIcon(192);
}
