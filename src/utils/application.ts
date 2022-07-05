import { INestApplication } from '@nestjs/common';

import { ParsePaginationRequestPipe } from './pagination/parse-pagination-request.pipe';
import { ParseSortingRequestPipe } from './sorting/sorting-request.pipe';
import { equalsIgnoreCase } from './string/equals-ignore-case';

export const useGlobalPipes = (app: INestApplication) => {
  app.useGlobalPipes(new ParsePaginationRequestPipe());
  app.useGlobalPipes(new ParseSortingRequestPipe());
};

export const ignoreQueryCase = (app: INestApplication) => {
  app.use((req: any, res: any, next: any) => {
    req.query = new Proxy(req.query, {
      get: (target, name) => target[Object.keys(target).find((key) => equalsIgnoreCase(key, name.toString())) ?? name],
    });

    next();
  });
};
