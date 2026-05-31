import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Text, Box } from '../../ink.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';

export function LogoV2() {
  const $ = _c(2);
  const { columns } = useTerminalSize();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Box><Text bold={true}>{"Cocode "}<Text dimColor={true}>v{MACRO.DISPLAY_VERSION ?? MACRO.VERSION}</Text></Text></Box>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
