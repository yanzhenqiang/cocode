import { c as _c } from "react-compiler-runtime";
import figures from 'figures';
import * as React from 'react';
import { Box, Text } from 'src/ink.js';
import { AGENT_COLOR_TO_THEME_COLOR, AGENT_COLORS, type AgentColorName } from 'src/tools/AgentTool/agentColorManager.js';
import type { PromptInputMode } from 'src/types/textInputTypes.js';
import type { Theme } from 'src/utils/theme.js';
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js';
type Props = {
  mode: PromptInputMode;
  isLoading: boolean;
  viewingAgentName?: string;
  viewingAgentColor?: AgentColorName;
};

type PromptCharProps = {
  isLoading: boolean;
  // Dead code elimination: parameter named themeColor to avoid "teammate" string in external builds
  themeColor?: keyof Theme;
};

/**
 * Renders the prompt character (❯).
 * Teammate color overrides the default color when set.
 */
function PromptChar(t0) {
  const $ = _c(3);
  const {
    isLoading,
    themeColor
  } = t0;
  const teammateColor = themeColor;
  const color = teammateColor ?? (false ? "subtle" : undefined);
  let t1;
  if ($[0] !== color || $[1] !== isLoading) {
    t1 = <Text color={color} dimColor={isLoading}>{figures.pointer} </Text>;
    $[0] = color;
    $[1] = isLoading;
    $[2] = t1;
  } else {
    t1 = $[2];
  }
  return t1;
}
export function PromptInputModeIndicator(t0) {
  const $ = _c(6);
  const {
    mode,
    isLoading,
    viewingAgentName,
    viewingAgentColor
  } = t0;
  const viewedTeammateThemeColor = viewingAgentColor ? AGENT_COLOR_TO_THEME_COLOR[viewingAgentColor] : undefined;
  let t2;
  if ($[0] !== isLoading || $[1] !== mode || $[2] !== viewedTeammateThemeColor || $[3] !== viewingAgentName) {
    t2 = <Box alignItems="flex-start" alignSelf="flex-start" flexWrap="nowrap" justifyContent="flex-start">{viewingAgentName ? <PromptChar isLoading={isLoading} themeColor={viewedTeammateThemeColor} /> : mode === "bash" ? <Text color="bashBorder" dimColor={isLoading}>! </Text> : <PromptChar isLoading={isLoading} />}</Box>;
    $[0] = isLoading;
    $[1] = mode;
    $[2] = viewedTeammateThemeColor;
    $[3] = viewingAgentName;
    $[4] = t2;
  } else {
    t2 = $[4];
  }
  return t2;
}
