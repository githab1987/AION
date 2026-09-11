export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    statusCode: number,
    code: string,
    message: string
  ) {
    super(message);

    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ErrorResponse {
  statusCode: number;
  body: {
    ok: false;
    error: string;
    message: string;
  };
}

export function errorResponse(
  error: unknown
): ErrorResponse {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      body: {
        ok: false,
        error: error.code,
        message: error.message
      }
    };
  }

  return {
    statusCode: 500,
    body: {
      ok: false,
      error: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error"
    }
  };
}
