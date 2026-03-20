import type { BuiltinToolManifest } from '@lobechat/types';

import { systemPrompt } from './systemRole';
import { LobeToolIdentifier, ToolsActivatorApiName } from './types';

export const LobeToolsManifest: BuiltinToolManifest = {
  api: [
    {
      description:
        'Activate tools from the <available_tools> list so their full API schemas become available for use. Call this before using any tool that is not yet activated. You can activate multiple tools at once.',
      name: ToolsActivatorApiName.activateTools,
      parameters: {
        properties: {
          identifiers: {
            description:
              'Array of tool identifiers to activate. Use the identifiers from the <available_tools> list.',
            items: {
              type: 'string',
            },
            type: 'array',
          },
        },
        required: ['identifiers'],
        type: 'object',
      },
    },
    {
      description:
        'Activate a skill by name to load its instructions. Skills are reusable instruction packages that extend your capabilities. Returns the skill content that you should follow to complete the task. If the skill is not found, returns a list of available skills.',
      name: ToolsActivatorApiName.activateSkill,
      parameters: {
        properties: {
          name: {
            description: 'The exact name of the skill to activate.',
            type: 'string',
          },
        },
        required: ['name'],
        type: 'object',
      },
    },
  ],
  identifier: LobeToolIdentifier,
  meta: {
    avatar: '🔧',
    description: 'Discover and activate tools on demand',
    title: 'Tools',
  },
  systemRole: systemPrompt,
  type: 'builtin',
};
