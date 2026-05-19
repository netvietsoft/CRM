export interface ApiErrorLike {
  message?: string;
  response?: {
    data?: {
      message?: string | string[];
    };
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiErrorLike;
    const responseMessage = apiError.response?.data?.message;

    if (Array.isArray(responseMessage)) {
      return responseMessage.join(', ');
    }

    return responseMessage || apiError.message || fallback;
  }

  return fallback;
}
