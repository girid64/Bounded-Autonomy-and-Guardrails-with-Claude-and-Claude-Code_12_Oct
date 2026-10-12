import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  ReviewReport,
  ReviewReportSchema,
  ReviewReportJSONSchema,
} from './types/report-types';
import { mcpServersConfig } from './config/mcp.config';
import { codeQualityAnalyzer } from './agents/code-quality-analyzer';
import { testCoverageAnalyzer } from './agents/test-coverage-analyzer';
import { refactoringSuggester } from './agents/refactoring-suggester';
import { orchestratorPrompt } from './prompts/orchestrator.prompt';

export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
}

export class CodeReviewOrchestrator {
  private options: OrchestratorOptions;

  constructor(options: OrchestratorOptions = {}) {
    this.options = options;
  }

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const start = Date.now();

    const prompt = `${orchestratorPrompt}

Review this pull request:
- Repository owner: ${owner}
- Repository name: ${repo}
- Pull request number: ${prNumber}

Return ONLY the final ReviewReport JSON.`;

    let result: unknown;

    for await (const message of query({
      prompt,
      options: {

hooks: {
  PreToolUse: [
    {
      hooks: [
        async (input) => {
          console.log('[TOOL CALL]', JSON.stringify(input));
          return { continue: true };
        },
      ],
    },
  ],
},

        model: this.options.model,
        maxTurns: this.options.maxTurns ?? 30,
        maxBudgetUsd: this.options.maxBudgetUsd,
        mcpServers: mcpServersConfig,
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer,
          'test-coverage-analyzer': testCoverageAnalyzer,
          'refactoring-suggester': refactoringSuggester,
        },
        allowedTools: [
          'Task',
          'Read',
          'Grep',
          'Glob',
          'Skill',
          'mcp__github__*',
          'mcp__eslint__*',
        ],
        outputFormat: {
          type: 'json_schema',
          schema: ReviewReportJSONSchema,
        },
      },
    })) {
      if (message.type === 'result') {
console.log('[DEBUG] SDK result:', {
  subtype: message.subtype,
  is_error: message.is_error,
  num_turns: message.num_turns,
  total_cost_usd: message.total_cost_usd,
  permission_denials: message.permission_denials,
  errors: 'errors' in message ? message.errors : [],
});        
        if (message.subtype !== 'success') {
          throw new Error(
            `Claude SDK review failed (${message.subtype}): ${
              message.errors.join('; ')
            }`
          );
        }

        if (message.is_error) {
          throw new Error('Claude SDK returned an error result');
        }

        result = message.structured_output ?? message.result;
      }
    }

    if (result === undefined || result === null || result === '') {
      throw new Error('Claude did not return a structured review report');
    }

    let report: unknown;

    try {
      report = typeof result === 'string' ? JSON.parse(result) : result;
    } catch (error) {
      throw new Error(
        `Claude returned invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const validated = ReviewReportSchema.parse(report);

    return {
      ...validated,
      metadata: {
        ...validated.metadata,
        duration: Date.now() - start,
      },
    };
  }
}