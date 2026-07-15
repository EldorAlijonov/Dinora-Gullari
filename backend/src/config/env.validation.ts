const productionRequiredKeys = ['MONGODB_URI', 'JWT_SECRET', 'TELEGRAM_BOT_TOKEN'];
const weakJwtSecrets = new Set(['change_me', 'your_jwt_secret', 'secret', 'jwt_secret']);
const allowedSameSiteValues = new Set(['lax', 'strict', 'none']);

function requireProductionValue(config: Record<string, string | undefined>, key: string) {
  if (config.NODE_ENV === 'production' && !config[key]) {
    throw new Error(`${key} is required in production`);
  }
}

export function validateEnv(config: Record<string, string | undefined>) {
  productionRequiredKeys.forEach((key) => requireProductionValue(config, key));

  if (config.NODE_ENV === 'production') {
    if (!config.CLIENT_URL && !config.CLIENT_URLS) {
      throw new Error('CLIENT_URL or CLIENT_URLS is required in production');
    }

    if (weakJwtSecrets.has(config.JWT_SECRET || '') || (config.JWT_SECRET || '').length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters and must not use a default value in production');
    }

    const usesLocalMongo = config.MONGODB_URI?.includes('localhost') || config.MONGODB_URI?.includes('127.0.0.1');
    if (usesLocalMongo && config.ALLOW_LOCAL_MONGODB !== 'true') {
      throw new Error('MONGODB_URI must point to a production database unless ALLOW_LOCAL_MONGODB=true is set');
    }
  }

  const sameSite = (config.COOKIE_SAME_SITE || 'lax').toLowerCase();
  if (!allowedSameSiteValues.has(sameSite)) {
    throw new Error('COOKIE_SAME_SITE must be one of: lax, strict, none');
  }

  if (sameSite === 'none' && config.NODE_ENV !== 'production') {
    throw new Error('COOKIE_SAME_SITE=none should only be used with NODE_ENV=production and HTTPS');
  }

  return {
    ...config,
    JWT_EXPIRES_IN: config.JWT_EXPIRES_IN || '12h',
    PORT: config.PORT || '5000',
    COOKIE_SAME_SITE: sameSite,
    REQUEST_BODY_LIMIT: config.REQUEST_BODY_LIMIT || '10mb',
    RATE_LIMIT_WINDOW_MS: config.RATE_LIMIT_WINDOW_MS || '60000',
    RATE_LIMIT_MAX: config.RATE_LIMIT_MAX || '180',
  };
}
