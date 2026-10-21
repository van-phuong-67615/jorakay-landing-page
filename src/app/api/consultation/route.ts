import { handleConsultation } from "@/lib/server/consultation";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleConsultation(request);
}
