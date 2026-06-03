import { c as _c } from "react-compiler-runtime";
import React from 'react';
import { Box, Text } from 'src/ink.js';
import { MessageResponse } from '../MessageResponse.js';

type RateLimitMessageProps = {
  text: string;
};

export function RateLimitMessage(t0) {
  const $ = _c(4);
  const {
    text,
  } = t0;
  let t2;
  if ($[0] !== text) {
    t2 = <MessageResponse><Box flexDirection="column"><Text color="error">{text}</Text></Box></MessageResponse>;
    $[0] = text;
    $[1] = t2;
  } else {
    t2 = $[1];
  }
  return t2;
}
