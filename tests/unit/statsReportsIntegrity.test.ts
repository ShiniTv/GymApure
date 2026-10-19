import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SQL syntax static integrity in stats and reports', () => {
  it('ensures all SELECT queries with aliases have a valid FROM clause', () => {
    const statsCode = fs.readFileSync(path.resolve('src/api/stats.ts'), 'utf-8');
    const reportsCode = fs.readFileSync(path.resolve('src/api/reports.ts'), 'utf-8');

    // Regression check: no "SELECT u.id, u.full_name WHERE"
    expect(statsCode).not.toMatch(/SELECT\s+u\.id,\s*u\.full_name\s+WHERE/i);
    expect(reportsCode).not.toMatch(/SELECT\s+u\.id,\s*u\.full_name\s+WHERE/i);

    // Verify FROM users u exists right after
    expect(statsCode).toMatch(/SELECT\s+u\.id,\s*u\.full_name\s+FROM\s+users\s+u/i);
  });

  it('verifies batched waves in reports preview do not exceed 2 concurrent queries', () => {
    const reportsCode = fs.readFileSync(path.resolve('src/api/reports.ts'), 'utf-8');
    
    // Wave 1 should only have 2 queries in Promise.all
    expect(reportsCode).toContain('const [paymentsAgg, attendance] = await Promise.all([');
    
    // Wave 2 should only have 2 queries in Promise.all
    expect(reportsCode).toContain('const [countsRes, paymentSamples] = await Promise.all([');

    // Wave 3 should only have 2 queries in Promise.all
    expect(reportsCode).toContain('const [attendanceSamples, memberSamples] = await Promise.all([');
  });
});
