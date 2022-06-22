import { buildMessage, ValidateBy, ValidationOptions } from 'class-validator';

export function IsBigInt(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isBigInt',
      constraints: [],
      validator: {
        validate: (value): boolean => typeof value === 'bigint',
        defaultMessage: buildMessage((eachPrefix) => eachPrefix + '$property must be convertible to bigint', validationOptions),
      },
    },
    validationOptions,
  );
}
