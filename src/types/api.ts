/**
 * Actual JSON shapes returned by the backend.
 *
 * The NestJS ResponseInterceptor wraps every response in ApiEnvelope<T>.
 * Paginated list endpoints put a PaginatedPayload<T> into the `data` field.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
  timestamp: string;
  path?: string;
}

export interface PaginatedPayload<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
