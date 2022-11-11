import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import dayjs from 'dayjs';

export function IsValidDateFilter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsValidDateFilterConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'IsValidDateFilter' })
export class IsValidDateFilterConstraint
  implements ValidatorConstraintInterface {

  validate(property: string, args: ValidationArguments) {
    const otherProperties = args.object;
    const startDate = dayjs.unix(otherProperties['start_date']);
    const endDate = dayjs.unix(otherProperties['end_date']);
    const diff = Math.abs(startDate.diff(endDate, 'month'));
    return !(diff > 12 || diff < 1);
  }
}