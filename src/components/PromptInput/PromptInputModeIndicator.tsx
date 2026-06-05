import { c as _c } from "react-compiler-runtime";
import figures from 'figures';
import * as React from 'react';
import { Box, Text } from 'src/ink.js';
import type { PromptInputMode } from 'src/types/textInputTypes.js';
type Props = {
  mode: PromptInputMode;
  isLoading: boolean;
};

/**
 * Renders the prompt character (❯).
 */
function PromptChar(t0) {
  const $ = _c(3);
  const {
    isLoading,
  } = t0;
  let t1;
  if ($[0] !== isLoading) {
    t1 = <Text dimColor={isLoading}>{figures.pointer} </Text>;
    $[0] = isLoading;
    $[1] = t1;
  } else {
    t1 = $[1];
  }
  return t1;
}
export function PromptInputModeIndicator(t0) {
  const $ = _c(6);
  const {
    mode,
    isLoading,
  } = t0;
  let t2;
  if ($[0] !== isLoading || $[1] !== mode) {
    t2 = <Box alignItems="flex-start" alignSelf="flex-start" flexWrap="nowrap" justifyContent="flex-start">{mode === "bash" ? <Text color="bashBorder" dimColor={isLoading}>! </Text> : <PromptChar isLoading={isLoading} />}</Box>;
    $[0] = isLoading;
    $[1] = mode;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  return t2;
}
