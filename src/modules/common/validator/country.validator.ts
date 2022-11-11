import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ResponseMessage } from '../../../utils/enum';
import Country from '../country.json';
@ValidatorConstraint({ name: 'ValidCountry', async: true })
@Injectable()
export class CountryValidator implements ValidatorConstraintInterface {
  async validate(value: string) {
    try {
      const valid = Country.findIndex((c) => c.name === value);
      return valid > -1 ? true : false;
    } catch (e) {
      return false;
    }
  }

  defaultMessage() {
    return ResponseMessage.INVALID_COUNTRY;
  }
}

export function IsValidCountry(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'ValidCountry',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: CountryValidator,
    });
  };
}
