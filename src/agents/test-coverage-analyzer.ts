import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { testCoverageAnalyzerPrompt } from '../prompts/test-coverage-analyzer.prompt';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Analyzes test coverage, missing test cases, and testing quality for changed code.',
  prompt: testCoverageAnalyzerPrompt,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};
