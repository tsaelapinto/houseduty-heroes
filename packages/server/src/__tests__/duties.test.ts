import request from 'supertest';
import { app } from '../index';
import { seedTestData, cleanTestData } from './testHelpers';

let testData: Awaited<ReturnType<typeof seedTestData>>;
let parentToken: string;
let kidToken: string;

beforeAll(async () => {
  testData = await seedTestData();

  const parentLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'testmum@test.com', pin: 'parent123', role: 'PARENT' });
  parentToken = parentLogin.body.token;

  const kidLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'TestKid', pin: '1234', role: 'KID' });
  kidToken = kidLogin.body.token;
});

afterAll(async () => {
  await cleanTestData();
});

describe('GET /api/duties/templates', () => {
  test('returns templates for the household', async () => {
    const res = await request(app)
      .get(`/api/duties/templates?householdId=${testData.household.id}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ name: 'Clear the Table', defaultPoints: 10 });
  });

  test('missing householdId returns 400', async () => {
    const res = await request(app).get('/api/duties/templates');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/duties/today/:kidId', () => {
  test('returns today duties for the kid', async () => {
    const res = await request(app)
      .get(`/api/duties/today/${testData.kid.id}`)
      .set('Authorization', `Bearer ${kidToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].status).toBe('ASSIGNED');
    expect(res.body[0].template.name).toBe('Clear the Table');
  });
});

describe('POST /api/duties/assign', () => {
  test('parent assigns a duty to a kid', async () => {
    const res = await request(app)
      .post('/api/duties/assign')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        kidId: testData.kid.id,
        templateId: testData.template.id,
        householdId: testData.household.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.kidId).toBe(testData.kid.id);
    expect(res.body.status).toBe('ASSIGNED');
  });

  test('missing kidId returns 400', async () => {
    const res = await request(app)
      .post('/api/duties/assign')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ householdId: testData.household.id });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/duties/:id/submit', () => {
  test('kid submits an assigned duty', async () => {
    const res = await request(app)
      .post(`/api/duties/${testData.duty.id}/submit`)
      .set('Authorization', `Bearer ${kidToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });
});

describe('POST /api/duties/:id/approve', () => {
  test('parent approves a submitted duty', async () => {
    // First make sure it's submitted
    await request(app)
      .post(`/api/duties/${testData.duty.id}/submit`)
      .set('Authorization', `Bearer ${kidToken}`);

    const res = await request(app)
      .post(`/api/duties/${testData.duty.id}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ parentId: testData.parent.id });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
  });
});
