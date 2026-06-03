import { c as _c } from "react-compiler-runtime";
import figures from 'figures';
import * as React from 'react';
import { useState } from 'react';
import { useAppState } from 'src/state/AppState.js';
import { isPanelAgentTask } from 'src/tasks/LocalAgentTask/LocalAgentTask.js';
import { getPillLabel, pillNeedsCta } from 'src/tasks/pillLabel.js';
import { type BackgroundTaskState, isBackgroundTask, type TaskState } from 'src/tasks/types.js';
import { Box, Text } from '../../ink.js';
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js';
type Props = {
  tasksSelected: boolean;
  onOpenDialog?: (taskId?: string) => void;
};
export function BackgroundTaskStatus(t0) {
  const $ = _c(13);
  const {
    tasksSelected,
    onOpenDialog
  } = t0;
  const tasks = useAppState(_temp);
  let t3;
  if ($[0] !== tasks) {
    t3 = (Object.values(tasks ?? {}) as TaskState[]).filter(_temp3);
    $[0] = tasks;
    $[1] = t3;
  } else {
    t3 = $[1];
  }
  const runningTasks = t3;
  if (runningTasks.length === 0) {
    return null;
  }
  let t8;
  if ($[2] !== runningTasks) {
    t8 = getPillLabel(runningTasks);
    $[2] = runningTasks;
    $[3] = t8;
  } else {
    t8 = $[3];
  }
  let t9;
  if ($[4] !== onOpenDialog || $[5] !== t8 || $[6] !== tasksSelected) {
    t9 = <SummaryPill selected={tasksSelected} onClick={onOpenDialog}>{t8}</SummaryPill>;
    $[4] = onOpenDialog;
    $[5] = t8;
    $[6] = tasksSelected;
    $[7] = t9;
  } else {
    t9 = $[7];
  }
  let t10;
  if ($[8] !== runningTasks) {
    t10 = pillNeedsCta(runningTasks) && <Text dimColor={true}> · {figures.arrowDown} to view</Text>;
    $[8] = runningTasks;
    $[9] = t10;
  } else {
    t10 = $[9];
  }
  let t11;
  if ($[10] !== t10 || $[11] !== t9) {
    t11 = <>{t9}{t10}</>;
    $[10] = t10;
    $[11] = t9;
    $[12] = t11;
  } else {
    t11 = $[12];
  }
  return t11;
}
function _temp3(t) {
  return isBackgroundTask(t) && !(false && isPanelAgentTask(t));
}
function _temp(s) {
  return s.tasks;
}
function SummaryPill(t0) {
  const $ = _c(8);
  const {
    selected,
    onClick,
    children
  } = t0;
  const [hover, setHover] = useState(false);
  const t1 = selected || hover;
  let t2;
  if ($[0] !== children || $[1] !== t1) {
    t2 = <Text color="background" inverse={t1}>{children}</Text>;
    $[0] = children;
    $[1] = t1;
    $[2] = t2;
  } else {
    t2 = $[2];
  }
  const label = t2;
  if (!onClick) {
    return label;
  }
  let t3;
  let t4;
  if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
    t3 = () => setHover(true);
    t4 = () => setHover(false);
    $[3] = t3;
    $[4] = t4;
  } else {
    t3 = $[3];
    t4 = $[4];
  }
  let t5;
  if ($[5] !== label || $[6] !== onClick) {
    t5 = <Box onClick={onClick} onMouseEnter={t3} onMouseLeave={t4}>{label}</Box>;
    $[5] = label;
    $[6] = onClick;
    $[7] = t5;
  } else {
    t5 = $[7];
  }
  return t5;
}
