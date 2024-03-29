import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Country } from 'country-state-city';
import { ResponseMessage } from '../../../utils/enum';
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  CountryCallingCode,
} from 'libphonenumber-js';

@ValidatorConstraint({ name: 'ValidCountry', async: true })
@Injectable()
export class PhoneNumberValidator implements ValidatorConstraintInterface {
  async validate(value: string, args: any) {
    try {
      const country = Country.getAllCountries().find(
        (c) => c.name === args.object.country,
      );
      const phoneNumber = parsePhoneNumberFromString(value);
      const countryCode = country.phonecode as CountryCallingCode;
      return countryCode === phoneNumber.countryCallingCode
        ? isValidPhoneNumber(value, {
            defaultCallingCode: phoneNumber.countryCallingCode,
          })
        : false;
    } catch (e) {
      return false;
    }
  }

  defaultMessage() {
    return ResponseMessage.INVALID_PHONE_NUMBER;
  }
}

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'ValidPhoneNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: PhoneNumberValidator,
    });
  };
}
