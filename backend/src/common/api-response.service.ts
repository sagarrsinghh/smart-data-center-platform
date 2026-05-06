import { Injectable } from '@nestjs/common';
import { ApiResponse } from './interfaces/api-response.interface';

@Injectable()
export class ApiResponseService {
  success<T>(
    message: string,
    data?: T,
    statusCode: number = 200,
  ): ApiResponse<T> {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  error(
    message: string,
    statusCode: number = 400,
    errorType: string = 'Error',
  ): ApiResponse {
    return {
      success: false,
      statusCode,
      message,
      errorType,
      timestamp: new Date().toISOString(),
    };
  }
}
