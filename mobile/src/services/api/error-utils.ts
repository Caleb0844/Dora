import axios from 'axios';

export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'server'
  | 'forbidden'
  | 'not-found'
  | 'api'
  | 'unknown';

export type AppError = {
  kind: AppErrorKind;
  message: string;
};

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, unknown>;
};

function firstValidationError(
  errors: Record<string, unknown> | undefined
): string | null {
  if (!errors) {
    return null;
  }

  const firstError = Object.values(errors)[0];

  if (firstError == null) {
    return null;
  }

  return String(firstError);
}

export function getAppError(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.'
): AppError {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return {
      kind: 'unknown',
      message: fallbackMessage,
    };
  }

  if (
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT'
  ) {
    return {
      kind: 'timeout',
      message:
        'The request is taking longer than expected. Please try again.',
    };
  }

  if (!error.response) {
    return {
      kind: 'network',
      message:
        'Could not connect to Twende. Check your internet connection and try again.',
    };
  }

  const status = error.response.status;
  const body = error.response.data;

  if (status >= 500) {
    return {
      kind: 'server',
      message:
        'Twende is temporarily unavailable. Please try again in a moment.',
    };
  }

  if (status === 403) {
    return {
      kind: 'forbidden',
      message: 'You do not have permission to do that.',
    };
  }

  if (status === 404) {
    return {
      kind: 'not-found',
      message: body?.message ?? 'The requested item could not be found.',
    };
  }

  const validationMessage =
    firstValidationError(body?.errors);

  if (validationMessage) {
    return {
      kind: 'api',
      message: validationMessage,
    };
  }

  if (body?.message) {
    return {
      kind: 'api',
      message: body.message,
    };
  }

  return {
    kind: 'unknown',
    message: fallbackMessage,
  };
}
