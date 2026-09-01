export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    options?: { code?: string; status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = options?.code ?? "APP_ERROR";
    this.status = options?.status ?? 400;
  }
}

const SAFE_HEBREW_PREFIX = /^(יש |לא |חסר|העלא|שמיר|הסריק|ההתח|ההרש|יציר|קריא|מזהה|כתובת|הסיסמ|הנתונ|התקבל|משהו)/;

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error && SAFE_HEBREW_PREFIX.test(error.message)) {
    return error.message;
  }

  return "משהו השתבש. נסו שוב בעוד רגע.";
}
