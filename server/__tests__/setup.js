import dotenv from 'dotenv';
import { jest } from '@jest/globals';

dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_testing_only';
process.env.DB_TYPE = 'file';
process.env.SEED_PASSWORD = 'test_password';

jest.setTimeout(10000);

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});