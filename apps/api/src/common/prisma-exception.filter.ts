import {
  type ArgumentsHost,
  Catch,
  ConflictException,
  type ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { Prisma } from "../generated/prisma/client.js";

// Turns known database errors into clear HTTP errors and hides internals of unknown ones.
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(exception);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(exception: unknown): HttpException {
    if (exception instanceof HttpException) return exception;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") return new ConflictException("This record already exists");
      if (exception.code === "P2025") return new NotFoundException("Record not found");
    }

    this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    return new InternalServerErrorException("Unexpected server error");
  }
}
