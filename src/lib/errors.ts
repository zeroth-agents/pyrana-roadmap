import { NextResponse } from "next/server";

export function errorResponse(
  message: string,
  code: string,
  status: number
) {
  return NextResponse.json({ error: message, code }, { status });
}

export function unauthorized(message = "Not authenticated") {
  return errorResponse(message, "UNAUTHORIZED", 401);
}

export function badRequest(message: string) {
  return errorResponse(message, "BAD_REQUEST", 400);
}

export function forbidden(message = "Forbidden") {
  return errorResponse(message, "FORBIDDEN", 403);
}

export function notFound(message = "Not found") {
  return errorResponse(message, "NOT_FOUND", 404);
}
