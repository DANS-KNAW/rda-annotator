import { describe, expect, it } from 'vitest'
import { parseApiError } from '@/utils/parse-api-error'

describe('parseApiError', () => {
  it('should extract message string from NestJS error', async () => {
    const response = new Response(
      JSON.stringify({ message: 'Invalid ORCID format', statusCode: 400 }),
      { status: 400, statusText: 'Bad Request' },
    )
    expect(await parseApiError(response)).toBe('Invalid ORCID format')
  })

  it('should join array of error messages', async () => {
    const response = new Response(
      JSON.stringify({
        message: ['Field is required', 'Invalid value'],
        statusCode: 400,
      }),
      { status: 400, statusText: 'Bad Request' },
    )
    expect(await parseApiError(response)).toBe(
      'Field is required, Invalid value',
    )
  })

  it('should fallback to statusText for non-JSON response', async () => {
    const response = new Response('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    })
    expect(await parseApiError(response)).toBe('Failed: Internal Server Error')
  })

  it('should fallback to statusText when message field is missing', async () => {
    const response = new Response(
      JSON.stringify({ error: 'Something went wrong' }),
      { status: 400, statusText: 'Bad Request' },
    )
    expect(await parseApiError(response)).toBe('Failed: Bad Request')
  })

  it('should handle ORCID validation error message', async () => {
    const response = new Response(
      JSON.stringify({
        message:
          'Invalid ORCID format: abc123. Expected format: 0000-0000-0000-0000',
        statusCode: 400,
      }),
      { status: 400, statusText: 'Bad Request' },
    )
    expect(await parseApiError(response)).toBe(
      'Invalid ORCID format: abc123. Expected format: 0000-0000-0000-0000',
    )
  })

  it('should handle ORCID name resolution error message', async () => {
    const response = new Response(
      JSON.stringify({
        message:
          'Could not resolve name for ORCID: 0000-0000-0000-0000. The ORCID may not exist or may not have a public name.',
        statusCode: 400,
      }),
      { status: 400, statusText: 'Bad Request' },
    )
    expect(await parseApiError(response)).toBe(
      'Could not resolve name for ORCID: 0000-0000-0000-0000. The ORCID may not exist or may not have a public name.',
    )
  })
})
