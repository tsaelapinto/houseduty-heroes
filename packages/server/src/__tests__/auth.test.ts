import request from 'supertest';
import { app } from '../index';
import { seedTestData, cleanTestData } from './testHelpers';

let testData: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  testData = await seedTestData();
});

afterAll(async () => {
  await cleanTestData();
});

describe('POST /api/auth/login', () => {
  test('parent login with correct credentials returns user + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testmum@test.com', pin: 'parent123', role: 'PARENT' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('testmum@test.com');
    expect(res.body.user.role).toBe('PARENT');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('parent login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testmum@test.com', pin: 'wrongpassword', role: 'PARENT' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('kid login with correct name + PIN returns user + token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'TestKid', pin: '1234', role: 'KID' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('TestKid');
    expect(res.body.user.role).toBe('KID');
    expect(res.body.user.kidPin).toBeUndefined();
  });

  test('kid login with wrong PIN returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'TestKid', pin: '9999', role: 'KID' });

    expect(res.status).toBe(401);
  });

  test('missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testmum@test.com' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register', () => {
  let createdEmail = `new-${Date.now()}@test.com`;

  test('creates a new parent + household and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'NewParent',
        email: createdEmail,
        password: 'securepass',
        householdName: 'New Family',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('PARENT');
    expect(res.body.user.email).toBe(createdEmail);
  });

  test('duplicate email returns 409', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Another', email: createdEmail, password: 'pass123' });

    expect(res.status).toBe(409);
  });

  test('missing required fields returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Incomplete' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/add-kid', () => {
  test('creates a kid under the household', async () => {
    const res = await request(app)
      .post('/api/auth/add-kid')
      .send({
        name: 'Oren',
        pin: '5678',
        householdId: testData.household.id,
        avatarSlug: 'super-rocket',
      });

    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('Oren');
    expect(res.body.user.role).toBe('KID');
    expect(res.body.user.kidPin).toBeUndefined();
  });

  test('missing householdId returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/add-kid')
      .send({ name: 'Oren', pin: '1234' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the user for a valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testmum@test.com', pin: 'parent123', role: 'PARENT' });

    const token = loginRes.body.token;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('testmum@test.com');
  });

  test('invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer badtoken');

    expect(res.status).toBe(401);
  });

  test('no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
