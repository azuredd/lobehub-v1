export const LobeToolIdentifier = 'lobe-tools';

export const ToolsActivatorApiName = {
  activateSkill: 'activateSkill',
  activateTools: 'activateTools',
};

export interface ActivateToolsParams {
  identifiers: string[];
}

export interface ActivatedToolInfo {
  apiCount: number;
  avatar?: string;
  identifier: string;
  name: string;
}

export interface ActivateToolsState {
  activatedTools: ActivatedToolInfo[];
  alreadyActive: string[];
  notFound: string[];
}

export interface ActivateSkillParams {
  name: string;
}

export interface ActivateSkillState {
  description?: string;
  hasResources: boolean;
  id: string;
  name: string;
}
