/**
 * Parse error response from NestJS API and extract the error message.
 * NestJS returns errors in the format: { message: string | string[], statusCode: number }
 */
export async function parseApiError(response: Response): Promise<string> {
  let errorMessage = `Failed: ${response.statusText}`
  try {
    const errorBody = await response.json()
    if (errorBody.message) {
      // NestJS returns errors as { message: string | string[] }
      errorMessage = Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : errorBody.message
    }
  }
  catch {
    // If body isn't JSON, use statusText fallback
  }
  return errorMessage
}
