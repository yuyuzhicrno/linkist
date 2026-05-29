import crypto from 'crypto';

const REQUIRED_ENV_VARS = ['JWT_SECRET'];
const INSECURE_DEFAULTS = [
  'linkist_dev_secret_2026',
  'linkist_production_secret_2026_change_in_production',
  '123456',
  'password',
  'secret',
  'admin'
];

export function validateConfig() {
  const errors = [];
  const warnings = [];

  if (process.env.NODE_ENV === 'production') {
    for (const varName of REQUIRED_ENV_VARS) {
      if (!process.env[varName]) {
        errors.push(`缺少必需的环境变量: ${varName}`);
      }
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      if (INSECURE_DEFAULTS.some(d => jwtSecret.includes(d))) {
        errors.push('JWT_SECRET 使用了不安全的默认值，请在生产环境中设置唯一的安全密钥');
      }
      if (jwtSecret.length < 32) {
        warnings.push('JWT_SECRET 长度小于 32 字符，建议使用更长的密钥');
      }
    }

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      if (INSECURE_DEFAULTS.some(d => dbUrl.includes(d))) {
        warnings.push('DATABASE_URL 包含不安全的默认密码');
      }
    }

    const seedPassword = process.env.SEED_PASSWORD;
    if (seedPassword && INSECURE_DEFAULTS.some(d => seedPassword.includes(d))) {
      warnings.push('SEED_PASSWORD 使用了不安全的默认值');
    }
  }

  if (errors.length > 0) {
    console.error('❌ 配置验证失败:');
    errors.forEach(e => console.error(`   - ${e}`));
    throw new Error('配置验证失败，请检查环境变量');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  配置警告:');
    warnings.forEach(w => console.warn(`   - ${w}`));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 开发环境模式 - 配置验证已跳过');
  }
}

export function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

export function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境必须设置 JWT_SECRET');
    }
    const devSecret = generateSecureSecret(32);
    console.log(`🔐 开发环境自动生成 JWT_SECRET: ${devSecret}`);
    return devSecret;
  }
  return process.env.JWT_SECRET;
}