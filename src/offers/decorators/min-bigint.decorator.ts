import { buildMessage, ValidateBy, ValidationOptions } from 'class-validator';


export const MIN = 'min';

/**
 * Checks if the first number is greater than or equal to the second.
 */
export function min(num: unknown, min: bigint): boolean {
  return typeof num === 'bigint' && typeof min === 'bigint' && num >= min;
}

/**
 * Checks if the first number is greater than or equal to the second.
 */
export function Min(minValue: number, validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: MIN,
      constraints: [minValue],
      validator: {
        validate: (value, args): boolean => min(value, args.constraints[0]),
        defaultMessage: buildMessage(
          eachPrefix => eachPrefix + '$property must not be less than $constraint1',
          validationOptions
        ),
      },
    },
    validationOptions
  );
}