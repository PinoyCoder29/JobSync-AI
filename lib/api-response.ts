import { AppError } from "@/lib/errors";

export type Pagination = { nextCursor: string | null; hasMore: boolean };
export type ApiErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED" | "FORBIDDEN" | "RATE_LIMITED" | "INTERNAL";

export type ApiSuccess<T> = { success: true; data: T; pagination?: Pagination };
export type ApiFailure = { success: false; error: { code: ApiErrorCode; message: string } };

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function ok<T>(data: T, pagination?: Pagination, status = 200): Response {
  const body: ApiSuccess<T> = pagination ? { success: true, data, pagination } : { success: true, data };
  return Response.json(body, { status });
}

export function fail(code: ApiErrorCode, message: string, headers?: HeadersInit): Response {
  const body: ApiFailure = { success: false, error: { code, message } };
  return Response.json(body, { status: STATUS[code], headers });
}

/** Turns any thrown value into a safe response. Technical details are logged, never returned. */
export function handleApiError(error: unknown): Response {
  // OTP-specific codes are for server actions/UI states; over HTTP they are plain validation failures.
  if (error instanceof AppError) return fail(error.code === "EXPIRED" || error.code === "LOCKED" || error.code === "INVALID_CODE" ? "VALIDATION" : error.code, error.message);
  console.error(error);
  return fail("INTERNAL", "Something went wrong on our side. Please try again.");
}
