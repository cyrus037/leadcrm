import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: unknown): { message: string; statusCode: number; code?: string } {
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode, code: error.code }
  }

  if (error instanceof ZodError) {
    return {
      message: error.issues.map((issue) => issue.message).join(', '),
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    }
  }

  if (error instanceof Error) {
    if (
      error.message.includes('connect') ||
      error.message.includes('Server selection timeout') ||
      error.message.includes('No available servers') ||
      error.message.includes('ReplicaSetNoPrimary')
    ) {
      return {
        message: 'Database unavailable. Check the MongoDB Atlas cluster status, IP access list, and DATABASE_URL.',
        statusCode: 503,
        code: 'DB_CONNECTION',
      }
    }
    return { message: error.message, statusCode: 500 }
  }

  return { message: 'An unexpected error occurred', statusCode: 500 }
}
