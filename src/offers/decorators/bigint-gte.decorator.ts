import { buildMessage, ValidateBy, ValidationOptions } from 'class-validator';

/**
 * Checks if the first number is greater than or equal to the second.
 */
function validateGte(num: unknown, min: bigint): boolean {
  return typeof num === 'bigint' && typeof min === 'bigint' && num >= min;
}

/**
 * Checks if the first number is greater than or equal to the second.
 */
export function BigIntGte(minValue: bigint, validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'BigIntGte',
      constraints: [minValue],
      validator: {
        validate: (value, args): boolean => validateGte(value, args.constraints[0]),
        defaultMessage: buildMessage(
          eachPrefix => eachPrefix + '$property must not be less than $constraint1',
          validationOptions
        ),
      },
    },
    validationOptions
  );
}