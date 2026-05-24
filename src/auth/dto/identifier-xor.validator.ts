import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'EmailOrPhoneXor', async: false })
export class EmailOrPhoneXorConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const value = args.object as { email?: string | null; phone?: string | null };
    const email = (value.email ?? '').trim();
    const phone = (value.phone ?? '').trim();
    const hasEmail = email.length > 0;
    const hasPhone = phone.length > 0;

    return (hasEmail && !hasPhone) || (!hasEmail && hasPhone);
  }

  defaultMessage(): string {
    return 'Provide exactly one of email or phone';
  }
}

export function EmailOrPhoneXor(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'EmailOrPhoneXor',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: EmailOrPhoneXorConstraint,
    });
  };
}
