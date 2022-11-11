export enum ADMIN_AUTH_TOKEN_EXPIRES {
  INVITE_EMAIL = '24h',
  ADMIN_AUTH_2FA = '30m',
  ADMIN_FORGOT_PASSWORD = '30m',
}

export enum ADMIN_AUTH_TOKEN_TYPES {
  LOGIN = 'LOGIN',
  INVITE_EMAIL = 'INVITE_EMAIL',
  ADMIN_AUTH_2FA = 'ADMIN_AUTH_2FA',
  ADMIN_FORGOT_PASSWORD = 'ADMIN_FORGOT_PASSWORD',
}
