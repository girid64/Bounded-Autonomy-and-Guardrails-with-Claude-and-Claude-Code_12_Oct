import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { codeQualityAnalyzerPrompt } from '../prompts/code-quality-analyzer.prompt';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes code for bugs, security vulnerabilities, maintainability, and code quality.',
  prompt: codeQualityAnalyzerPrompt,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};
