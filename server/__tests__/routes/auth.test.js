import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_testing_only';
process.env.DB_TYPE = 'file';
process.env.SEED_PASSWORD = 'test_password';

import { initDatabase } from '../../data/db.js';
import { initServerServices } from '../../services-registry.js';
import { authRouter } from '../../routes/auth.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

let db;

beforeAll(async () => {
  db = await initDatabase();
  await initServerServices();
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'password123'
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject registration with short username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'a',
          email: 'test@test.com',
          password: 'password123'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('输入验证失败');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid',
          password: 'password123'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('输入验证失败');
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@test.com',
          password: '123'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('输入验证失败');
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user1',
          email: 'duplicate@test.com',
          password: 'password123'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'duplicate@test.com',
          password: 'password123'
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('该邮箱已被注册');
    });
  });

  describe('POST /api/auth/login', () => {
    const testEmail = 'loginuser@test.com';
    const testPassword = 'password123';

    beforeAll(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'loginuser',
          email: testEmail,
          password: testPassword
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should reject login with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid',
          password: testPassword
        });
      expect(res.status).toBe(400);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword'
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('邮箱或密码错误');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testPassword
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('邮箱或密码错误');
    });
  });
});