import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint()
export class EpochValidator implements ValidatorConstraintInterface {
  /**
   * Check whether the string is a positive integer.
   *
   * @param value
   */
  public isPositiveInteger(value: string): boolean {
    return /^(\+)?([0-9]+)$/.test(value);
  }

  validate(text: string, validationArguments: ValidationArguments) {
    return this.isPositiveInteger(text);
  }
}
