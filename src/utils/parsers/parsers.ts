import { QueryParamArray } from '../query-param-array';
import { BadRequestException } from '@nestjs/common';
import { nullOrWhitespace } from '../string/null-or-white-space';

/**
 * Parse Request to BigInt
 * @param { String} request
 * @param {Function} onError - anonymous function
 * @return {BigInt}
 */
export function parseBigIntRequest(request: string | undefined, onError: () => void): BigInt | undefined {
    if (request === undefined || request === null) {
        return undefined;
    }
    try {
        return BigInt(request);
    } catch (e) {
        onError();
    }
}

/**
 * Parses the incoming Value into an Number
 * @param {String} value - the incoming parameter passes the nullOrWhitespace test
 * @param {Function} onError - anonymous function
 * @see nullOrWhitespace
 */
export function parseIntRequest(value: string | undefined | null, onError: () => void): number | undefined {
    if (nullOrWhitespace(value)) {
        return undefined;
    }

    const int = parseInt(value as string);
    if (Number.isNaN(int) || !Number.isFinite(int)) {
        onError();
    }
    return int;
}

/**
 * Parses the incoming (typeOf request === QueryParamArray) into an number array
 * @param {QueryParamArray} request - Has different types QueryParamArray
 * @param {Function} onError - anonymous function
 * @see QueryParamArray
 * @see parseIntRequest
 */
export function parseIntArrayRequest(request: QueryParamArray, onError: (badValue: string) => void): number[] {
    return requestArray(request)
        .map((v) => parseIntRequest(v, () => onError(v)))
        .filter((v) => v != null) as number[];
}

/**
 * Parses the incoming (typeOf collectionId === QueryParamArray) into an number array
 * @param {QueryParamArray} collectionId - Has different types QueryParamArray
 * @see QueryParamArray
 * @see parseIntArrayRequest
 */
export function parseCollectionIdRequest(collectionId: QueryParamArray): number[] {
    return parseIntArrayRequest(collectionId, (v) => {
        throw new BadRequestException({}, `Failed to parse collection id from ${JSON.stringify(collectionId)}, unable to parse ${v} as integer.`);
    });
}

/**
 * Parse incoming strings into an array of strings
 * @param {String} request
 * @return {Array}
 */
export function requestArray(request: string | string[] | undefined | null ): string[] {
    if (Array.isArray(request)) {
        return request;
    }

    if (request == null) {
        return [];
    }

    return [request];
}


/**
 * Parse incoming strings into an array of strings
 * @param {String} request
 * @return {Array}
 */
 export function requestArrayObject(request: any[] | undefined | null ): any[] {
  if (Array.isArray(request)) {
      return request;
  }

  if (request == null) {
      return [];
  }

  return [request];
}