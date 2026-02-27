// Runs BEFORE module imports in each test file — ensures Prisma picks up test DB
process.env.DATABASE_URL = 'file:./prisma/test.db';
process.env.JWT_SECRET = 'test_secret_do_not_use_in_prod';
process.env.NODE_ENV = 'test';
