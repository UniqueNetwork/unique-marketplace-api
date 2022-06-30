import { buildMessage, ValidateBy, ValidationOptions } from 'class-validator';

function validateLte(num: unknown, max: bigint): boolean {
  return typeof num === 'bigint' && typeof max === 'bigint' && num <= max;
}

/**
 * Checks if the first number is less than or equal to the second.
 */
export function BigIntLte(maxValue: bigint, validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'BigIntLte',
      constraints: [maxValue],
      validator: {
        validate: (value, args): boolean => validateLte(value, args.constraints[0]),
        defaultMessage: buildMessage(
          (eachPrefix) => eachPrefix + '$property must not be greater than $constraint1. $property must be a string',
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
