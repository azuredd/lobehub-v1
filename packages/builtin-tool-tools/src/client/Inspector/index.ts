import { ToolsActivatorApiName } from '../../types';
import { ActivateSkillInspector } from './ActivateSkill';
import { ActivateToolsInspector } from './ActivateTools';

export const LobeToolsInspectors = {
  [ToolsActivatorApiName.activateSkill]: ActivateSkillInspector,
  [ToolsActivatorApiName.activateTools]: ActivateToolsInspector,
};
