import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { Box, Text } from '../../ink.js';
import type { Theme } from '../../utils/theme.js';
type Props = {
  title: string;
  subtitle?: React.ReactNode;
  color?: keyof Theme;
};
export function PermissionRequestTitle(t0) {
  const $ = _c(10);
  const {
    title,
    subtitle,
    color: t1
  } = t0;
  const color = t1 === undefined ? "permission" : t1;
  let t2;
  if ($[0] !== color || $[1] !== title) {
    t2 = <Text bold={true} color={color}>{title}</Text>;
    $[0] = color;
    $[1] = title;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  let t3;
  if ($[3] !== t2) {
    t3 = <Box flexDirection="row" gap={1}>{t2}</Box>;
    $[3] = t2;
    $[4] = t3;
  } else {
    t3 = $[4];
  }
  let t4;
  if ($[5] !== subtitle) {
    t4 = subtitle != null && (typeof subtitle === "string" ? <Text dimColor={true} wrap="truncate-start">{subtitle}</Text> : subtitle);
    $[5] = subtitle;
    $[6] = t4;
  } else {
    t4 = $[6];
  }
  let t5;
  if ($[7] !== t3 || $[8] !== t4) {
    t5 = <Box flexDirection="column">{t3}{t4}</Box>;
    $[7] = t3;
    $[8] = t4;
    $[9] = t5;
  } else {
    t5 = $[9];
  }
  return t5;
}
