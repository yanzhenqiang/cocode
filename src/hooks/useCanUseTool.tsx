import { c as _c } from "react-compiler-runtime";
import { feature } from 'bun:bundle';
import { APIUserAbortError } from '@anthropic-ai/sdk';
import * as React from 'react';
import { useCallback } from 'react';
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from 'src/services/analytics/index.js';
import { sanitizeToolNameForAnalytics } from 'src/services/analytics/index.js';
import type { ToolUseConfirm } from '../components/permissions/PermissionRequest.js';
import { Text } from '../ink.js';
import type { ToolPermissionContext, Tool as ToolType, ToolUseContext } from '../Tool.js';
import { BASH_TOOL_NAME } from '../tools/BashTool/toolName.js';
import type { AssistantMessage } from '../types/message.js';
const recordAutoModeDenial = () => {}
const clearClassifierChecking = () => {}
const setYoloClassifierApproval = (_id: string, _reason: string) => {}
import { logForDebugging } from '../utils/debug.js';
import { AbortError } from '../utils/errors.js';
import { logError } from '../utils/log.js';
import type { PermissionDecision } from '../utils/permissions/PermissionResult.js';
import { hasPermissionsToUseTool } from '../utils/permissions/permissions.js';
import { jsonStringify } from '../utils/slowOperations.js';
import { handleCoordinatorPermission } from './toolPermission/handlers/coordinatorHandler.js';
import { handleInteractivePermission } from './toolPermission/handlers/interactiveHandler.js';
import { createPermissionContext, createPermissionQueueOps } from './toolPermission/PermissionContext.js';
import { logPermissionDecision } from './toolPermission/permissionLogging.js';
export type CanUseToolFn<Input extends Record<string, unknown> = Record<string, unknown>> = (tool: ToolType, input: Input, toolUseContext: ToolUseContext, assistantMessage: AssistantMessage, toolUseID: string, forceDecision?: PermissionDecision<Input>) => Promise<PermissionDecision<Input>>;
function useCanUseTool(setToolUseConfirmQueue, setToolPermissionContext) {
  const $ = _c(3);
  let t0;
  if ($[0] !== setToolPermissionContext || $[1] !== setToolUseConfirmQueue) {
    t0 = async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => new Promise(resolve => {
      const ctx = createPermissionContext(tool, input, toolUseContext, assistantMessage, toolUseID, setToolPermissionContext, createPermissionQueueOps(setToolUseConfirmQueue));
      if (ctx.resolveIfAborted(resolve)) {
        return;
      }
      const decisionPromise = forceDecision !== undefined ? Promise.resolve(forceDecision) : hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseID);
      return decisionPromise.then(async result => {
        if (result.behavior === "allow") {
          if (ctx.resolveIfAborted(resolve)) {
            return;
          }
          if (feature("TRANSCRIPT_CLASSIFIER") && result.decisionReason?.type === "classifier" && result.decisionReason.classifier === "auto-mode") {
            setYoloClassifierApproval(toolUseID, result.decisionReason.reason);
          }
          ctx.logDecision({
            decision: "accept",
            source: "config"
          });
          resolve(ctx.buildAllow(result.updatedInput ?? input, {
            decisionReason: result.decisionReason
          }));
          return;
        }
        const appState = toolUseContext.getAppState();
        const description = await tool.description(input as never, {
          isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
          toolPermissionContext: appState.toolPermissionContext,
          tools: toolUseContext.options.tools
        });
        if (ctx.resolveIfAborted(resolve)) {
          return;
        }
        switch (result.behavior) {
          case "deny":
            {
              logPermissionDecision({
                tool,
                input,
                toolUseContext,
                messageId: ctx.messageId,
                toolUseID
              }, {
                decision: "reject",
                source: "config"
              });
              if (feature("TRANSCRIPT_CLASSIFIER") && result.decisionReason?.type === "classifier" && result.decisionReason.classifier === "auto-mode") {
                recordAutoModeDenial({
                  toolName: tool.name,
                  display: description,
                  reason: result.decisionReason.reason ?? "",
                  timestamp: Date.now()
                });
                toolUseContext.addNotification?.({
                  key: "auto-mode-denied",
                  priority: "immediate",
                  jsx: <><Text color="error">{tool.userFacingName(input).toLowerCase()} denied by auto mode</Text><Text dimColor={true}> · /permissions</Text></>
                });
              }
              resolve(result);
              return;
            }
          case "ask":
            {
              if (appState.toolPermissionContext.awaitAutomatedChecksBeforeDialog) {
                const coordinatorDecision = await handleCoordinatorPermission({
                  ctx,
                  updatedInput: result.updatedInput,
                  suggestions: result.suggestions,
                  permissionMode: appState.toolPermissionContext.mode
                });
                if (coordinatorDecision) {
                  resolve(coordinatorDecision);
                  return;
                }
              }
              if (ctx.resolveIfAborted(resolve)) {
                return;
              }
              handleInteractivePermission({
                ctx,
                description,
                result,
                awaitAutomatedChecksBeforeDialog: appState.toolPermissionContext.awaitAutomatedChecksBeforeDialog,
                channelCallbacks: undefined
              }, resolve);
              return;
            }
        }
      }).catch(error => {
        if (error instanceof AbortError || error instanceof APIUserAbortError) {
          logForDebugging(`Permission check threw ${error.constructor.name} for tool=${tool.name}: ${error.message}`);
          ctx.logCancelled();
          resolve(ctx.cancelAndAbort(undefined, true));
        } else {
          logError(error);
          resolve(ctx.cancelAndAbort(undefined, true));
        }
      }).finally(() => {
        clearClassifierChecking(toolUseID);
      });
    });
    $[0] = setToolPermissionContext;
    $[1] = setToolUseConfirmQueue;
    $[2] = t0;
  } else {
    t0 = $[2];
  }
  return t0;
}
export default useCanUseTool;
