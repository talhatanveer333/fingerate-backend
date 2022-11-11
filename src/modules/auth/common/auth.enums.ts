export enum AuthEnum {
  RESET_PASSWORD_EXPIRY = '5m',
  AUTO_LOGIN_EXPIRY = '14d',
}

export enum Minutes {
  ONE = 1,
  FIVE = 5,
  THIRTY = 30,
  THREE = 180,
  SIXTY = 60,
}

export enum Attempts {
  FIVE = 5,
}

export enum UserStatusEnum {
  ACTIVE = 'Active',
  DISABLED = 'Disabled',
  TERMINATED = 'Terminated',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary'
}

export enum LoginType {
  SYSTEM = 'system',
  GOOGLE = 'google',
  NAVER = 'naver',
  KAKAO = 'kakao',
  APPLE = 'apple',
}
