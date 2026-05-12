const REQUIRED_PRODUCTION_ENV = ['JWT_ROTATION_SECRET', 'ADMIN_API_TOKEN', 'WEBHOOK_SIGNING_SECRET'];

export function validateProductionEnvironment(env = process.env) {
  if (env.NODE_ENV !== 'production') {
    return { valid: true, missing: [] };
  }
  const missing = REQUIRED_PRODUCTION_ENV.filter((name) => !env[name] || !String(env[name]).trim());
  if (missing.length) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  return { valid: true, missing: [] };
}
