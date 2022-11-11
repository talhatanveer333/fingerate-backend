import { registerDecorator, ValidationOptions } from 'class-validator';
import days from 'dayjs';
export function GreaterThanNow(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'greaterThan',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: any) {
          return value > days().unix();
        },
        defaultMessage() {
          return '$property must be greater than now';
        },
      },
    });
  };
}
