import type { ApiResponse } from '../types';

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

export function errorResponse<T>(error: string, message?: string): ApiResponse<T> {
  return {
    success: false,
    error,
    message
  };
}