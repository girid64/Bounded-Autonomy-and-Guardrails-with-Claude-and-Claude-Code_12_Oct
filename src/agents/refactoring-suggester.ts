import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { refactoringSuggesterPrompt } from '../prompts/refactoring-suggester.prompt';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies practical refactoring opportunities and safe code modernization improvements.',
  prompt: refactoringSuggesterPrompt,
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
};
