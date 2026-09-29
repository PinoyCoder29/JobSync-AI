/** Errors whose message is safe to show to the user. Anything else is logged and hidden. */
export class AppError extends Error {
  constructor(message: string, public readonly code: "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "UNAUTHORIZED" = "VALIDATION") {
    super(message);
    this.name = "AppError";
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return "Something went wrong on our side. Please try again.";
}
