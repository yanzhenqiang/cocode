import * as React from 'react';
import { memo } from 'react';
import { Box, Text } from '../ink.js';

type Props = {
  code: string;
  filePath: string;
  width?: number;
  dim?: boolean;
};

export const HighlightedCode = memo(function HighlightedCode({
  code,
  dim = false,
}: Props) {
  const lines = code.split('\n');
  return (
    <Box flexDirection="column">
      {lines.map((line, i) => (
        <Text key={i} dimColor={dim}>{line}</Text>
      ))}
    </Box>
  );
});
