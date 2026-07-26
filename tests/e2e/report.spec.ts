import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SCRIPT = join(__dirname, '../../scripts/last-run-report.sh');

function runReport(logContent: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'report-test-'));
  const logFile = join(dir, 'crons.log');
  writeFileSync(logFile, logContent);
  try {
    return execSync(`sh "${SCRIPT}" "${logFile}"`, { encoding: 'utf8' });
  } finally {
    try { unlinkSync(logFile); } catch {}
    try { require('fs').rmdirSync(dir); } catch {}
  }
}

test.describe('Feature: Last Run Report (shell script)', () => {
  test('should display report with all sections', () => {
    const log = [
      '=== RUN 2025-07-24_02:00:00 ===',
      'ADDED The.Matrix.1999.1080p',
      'ADDED Inception.2010.720p',
      '=================================================================',
      'Thu Jul 24 02:00:00 UTC 2025 - 12345 wishlist.txt',
      'Processing: The.Matrix.1999.1080p',
      '3 The.Matrix.1999.1080p',
      'Processing: Inception.2010.720p',
      '0 Inception.2010.720p',
      'DOWNLOADED The.Matrix.1999.1080p',
      'REMOVED Old.Movie.2020.480p',
      '',
    ].join('\n');

    const output = runReport(log);

    expect(output).toContain('Run timestamp: 2025-07-24_02:00:00');

    expect(output).toContain('--- ADDED TO WISHLIST (2) ---');
    expect(output).toContain('+ The.Matrix.1999.1080p');
    expect(output).toContain('+ Inception.2010.720p');

    expect(output).toContain('--- PROCESSED (2) ---');
    expect(output).toContain('> The.Matrix.1999.1080p (3 results)');
    expect(output).toContain('> Inception.2010.720p (0 results)');

    expect(output).toContain('--- DOWNLOADED (1) ---');
    expect(output).toContain('* The.Matrix.1999.1080p');

    expect(output).toContain('--- REMOVED (3-month cutoff) (1) ---');
    expect(output).toContain('- Old.Movie.2020.480p');
  });

  test('should show empty state when no runs recorded', () => {
    const output = runReport('');

    expect(output).toContain('No runs recorded yet. Log file is empty.');
  });

  test('should show (none) for empty sections', () => {
    const log = [
      '=== RUN 2025-07-24_02:00:00 ===',
    ].join('\n');

    const output = runReport(log);

    expect(output).toContain('--- ADDED TO WISHLIST (0) ---');
    expect(output).toContain('(none)');
    expect(output).toContain('--- PROCESSED (0) ---');
    expect(output).toContain('--- DOWNLOADED (0) ---');
    expect(output).toContain('--- REMOVED (3-month cutoff) (0) ---');
  });
});
