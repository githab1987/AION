export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown) {
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
