
import { describe, expect, it } from 'vitest';
import { ReportGenerator } from '../src/utils/report-generator';
import type { ReviewReport } from '../src/types/report-types';

const createReport = (): ReviewReport => ({
  pullRequest: {
    owner: 'octocat',
    repo: 'Hello-World',
    number: 1,
  },
  fileReviews: [
    {
      file: 'src/example.ts',
      codeQuality: {
        file: 'src/example.ts',
        issues: [
          {
            line: 10,
            severity: 'high',
            category: 'security',
            description: 'Unsafe input handling',
            suggestion: 'Validate the input',
          },
        ],
        overallScore: 85,
        summary: 'One security issue found',
      },
      testCoverage: {
        file: 'src/example.ts',
        hasTests: false,
        testFiles: [],
        untestedPaths: [
          {
            type: 'function',
            location: 'processInput',
            priority: 'high',
            reasoning: 'No test covers invalid input',
            suggestedTest: 'Test invalid input',
          },
        ],
        coverageEstimate: 60,
        summary: 'Some test gaps remain',
      },
      refactorings: {
        file: 'src/example.ts',
        suggestions: [
          {
            type: 'extract-function',
            location: 'processInput',
            impact: 'medium',
            description: 'Extract validation logic',
            before: 'Validation is inline',
            after: 'Use a dedicated validation function',
            benefits: 'Improves readability',
          },
        ],
        summary: 'One refactoring opportunity',
      },
    },
  ],
  summary: {
    totalFiles: 1,
    overallScore: 85,
    criticalIssues: 0,
    highPriorityTests: 1,
    refactoringOpportunities: 1,
  },
  recommendations: [
    {
      priority: 'high',
      category: 'Security',
      description: 'Validate untrusted input',
      files: ['src/example.ts'],
    },
  ],
  metadata: {
    analyzedAt: '2026-10-12T12:00:00.000Z',
    duration: 250,
    agentVersions: {
      codeQuality: '1.0',
      testCoverage: '1.0',
      refactoring: '1.0',
    },
  },
});

describe('ReportGenerator', () => {
  const generator = new ReportGenerator();

  it('generates a Markdown report with summary and file findings', () => {
    const markdown = generator.generateMarkdownReport(createReport());

    expect(markdown).toContain('# 🔍 Code Review Report');
    expect(markdown).toContain('85/100');
    expect(markdown).toContain('src/example.ts');
    expect(markdown).toContain('Unsafe input handling');
    expect(markdown).toContain('Validate untrusted input');
    expect(markdown).toContain('250ms');
  });

  it('shows empty-state messages when there are no findings', () => {
    const report = createReport();
    report.fileReviews = [];
    report.recommendations = [];

    const markdown = generator.generateMarkdownReport(report);

    expect(markdown).toContain('No recommendations at this time.');
    expect(markdown).toContain('## 📁 File Details');
  });

  it('generates an HTML report with summary metrics and recommendations', () => {
    const html = generator.generateHTMLReport(createReport());

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Code Review Report</title>');
    expect(html).toContain('Overall Score');
    expect(html).toContain('85');
    expect(html).toContain('Validate untrusted input');
    expect(html).toContain('rec-high');
    expect(html).toContain('250ms');
  });

  it('shows an empty-state message in HTML when there are no recommendations', () => {
    const report = createReport();
    report.recommendations = [];

    const html = generator.generateHTMLReport(report);

    expect(html).toContain('No recommendations at this time.');
  });

  it('generates valid, formatted JSON that preserves the report', () => {
    const report = createReport();
    const json = generator.generateJSONReport(report);

    expect(json).toBe(JSON.stringify(report, null, 2));
    expect(JSON.parse(json)).toEqual(report);
  });
});
