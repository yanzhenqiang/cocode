import type { StructuredPatchHunk } from 'diff';
import * as React from 'react';
import { memo } from 'react';
import { Box, Text } from '../ink.js';

type Props = {
  patch: StructuredPatchHunk;
  dim: boolean;
  filePath: string;
  firstLine: string | null;
  fileContent?: string;
  width: number;
  skipHighlighting?: boolean;
};

export const StructuredDiff = memo(function StructuredDiff({
  patch,
  dim = false,
}: Props) {
  return (
    <Box flexDirection="column">
      {patch.lines.map((line, i) => (
        <Text key={i} dimColor={dim}>{line}</Text>
      ))}
    </Box>
  );
});
