
import { describe, expect, it } from 'vitest';
import {
  CodeQualityResultSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
} from '../src/types/analysis-results';
import { ReviewReportSchema } from '../src/types/report-types';

describe('Analysis result schemas', () => {
  it('accepts a valid code quality result', () => {
    const result = {
      file: 'src/example.ts',
      issues: [{
        line: 10,
        severity: 'high',
        category: 'security',
        description: 'Unsafe input handling',
        suggestion: 'Validate the input',
      }],
      overallScore: 85,
      summary: 'One issue found',
    };

    expect(CodeQualityResultSchema.safeParse(result).success).toBe(true);
  });

  it('rejects an invalid severity', () => {
    const result = {
      file: 'src/example.ts',
      issues: [{
        line: 10,
        severity: 'urgent',
        category: 'security',
        description: 'Unsafe input handling',
        suggestion: 'Validate the input',
      }],
      overallScore: 85,
      summary: 'One issue found',
    };

    expect(CodeQualityResultSchema.safeParse(result).success).toBe(false);
  });

  it('rejects an overall score outside 0–100', () => {
    const result = {
      file: 'src/example.ts',
      issues: [],
      overallScore: 120,
      summary: 'Summary',
    };

    expect(CodeQualityResultSchema.safeParse(result).success).toBe(false);
  });

  it('accepts a valid test coverage result', () => {
    const result = {
      file: 'src/example.ts',
      hasTests: false,
      testFiles: [],
      untestedPaths: [{
        type: 'function',
        location: 'processInput',
        priority: 'high',
        reasoning: 'No test covers this function',
        suggestedTest: 'Test invalid input',
      }],
      coverageEstimate: 60,
      summary: 'Some test gaps remain',
    };

    expect(TestCoverageResultSchema.safeParse(result).success).toBe(true);
  });

  it('rejects a coverage estimate above 100', () => {
    const result = {
      file: 'src/example.ts',
      hasTests: true,
      testFiles: ['src/example.test.ts'],
      untestedPaths: [],
      coverageEstimate: 110,
      summary: 'Summary',
    };

    expect(TestCoverageResultSchema.safeParse(result).success).toBe(false);
  });

  it('accepts a valid refactoring suggestion', () => {
    const result = {
      file: 'src/example.ts',
      suggestions: [{
        type: 'extract-function',
        location: 'processInput',
        impact: 'medium',
        description: 'Extract validation logic',
        before: 'Validation is inline',
        after: 'Use a dedicated function',
        benefits: 'Improves readability',
      }],
      summary: 'One refactoring opportunity',
    };

    expect(RefactoringSuggestionSchema.safeParse(result).success).toBe(true);
  });

  it('rejects an invalid refactoring type', () => {
    const result = {
      file: 'src/example.ts',
      suggestions: [{
        type: 'rewrite-everything',
        location: 'processInput',
        impact: 'medium',
        description: 'Rewrite the function',
        before: 'Old code',
        after: 'New code',
        benefits: 'Simpler implementation',
      }],
      summary: 'Summary',
    };

    expect(RefactoringSuggestionSchema.safeParse(result).success).toBe(false);
  });

  it('accepts a valid review report', () => {
    const report = {
      pullRequest: {
        owner: 'octocat',
        repo: 'Hello-World',
        number: 1,
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 100,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0,
      },
      recommendations: [],
      metadata: {
        analyzedAt: '2026-10-12T12:00:00.000Z',
        duration: 250,
        agentVersions: {
          codeQuality: '1.0',
          testCoverage: '1.0',
          refactoring: '1.0',
        },
      },
    };

    expect(ReviewReportSchema.safeParse(report).success).toBe(true);
  });

  it('rejects a review report with a missing repository name', () => {
    const report = {
      pullRequest: {
        owner: 'octocat',
        number: 1,
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 100,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0,
      },
      recommendations: [],
      metadata: {
        analyzedAt: '2026-10-12T12:00:00.000Z',
        duration: 250,
        agentVersions: {},
      },
    };

    expect(ReviewReportSchema.safeParse(report).success).toBe(false);
  });
});
