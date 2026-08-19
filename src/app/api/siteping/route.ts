import { getSitepingHandlers } from "@/lib/siteping-handler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getSitepingHandlers().GET(request);
}

export async function POST(request: Request) {
  return getSitepingHandlers().POST(request);
}

export async function PATCH(request: Request) {
  return getSitepingHandlers().PATCH(request);
}

export async function DELETE(request: Request) {
  return getSitepingHandlers().DELETE(request);
}

export async function OPTIONS(request: Request) {
  return getSitepingHandlers().OPTIONS(request);
}
