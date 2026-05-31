import { c as _c } from "react-compiler-runtime";
import React from 'react';
import { Text, useTheme } from 'src/ink.js';

export function WelcomeV2() {
  const $ = _c(2);
  const [theme] = useTheme();
  let t0;
  if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
    t0 = <Text><Text color="claude">{"Cocode"} </Text><Text dimColor={true}>v{MACRO.DISPLAY_VERSION ?? MACRO.VERSION}</Text></Text>;
    $[0] = t0;
  } else {
    t0 = $[0];
  }
  return t0;
}
