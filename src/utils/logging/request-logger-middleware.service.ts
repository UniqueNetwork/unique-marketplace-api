import { Request, Response, NextFunction } from "express";
import { Injectable, NestMiddleware, Logger } from "@nestjs/common";

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger(RequestLoggerMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, body } = request;

    response.on("finish", () => {
      const { statusCode } = response;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode}, body: ${JSON.stringify(body)}`,
      );
    });

    next();
  }
}