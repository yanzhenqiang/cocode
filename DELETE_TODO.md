# 死函数删除 TODO

## 已删除 68 个（全部测试 10/10）

- addItemToJSONCArray, addToInMemoryErrorLog, getPrivacyLevel (batch 1)
- appendTaskOutput, areMcpConfigsEqual, attachAnalyticsSink, attributionRestoreStateFromLog, buildAnthropicUsageFromRawUsage, buildRevParseFailureMessage, buildSurfaceKey, calculateLayoutDimensions, calculateOptimalLeftWidth, canYankPop (batch 2)
- checkForReleaseNotesSync, chordToDisplayString, clampRect, classifyAxiosError, cleanupAgentTracking, clearAgentTranscriptSubdir, clearAllAsyncHooks, clearAllOutputStylesCache, clearConversationMessages, clearConversationState (batch 3)
- clearBetasCaches, clearBundledSkills, clearDirectoryCache, clearGrowthBookConfigOverrides, clearHookEventState, clearKillRing, clearMcpClientConfig, clearOutputStyleCaches, clearStoredImagePaths, clearTimeoutCache (batch 4)
- clearPathCache, clearPendingHint, clearPendingHistoryEntries, clearPlanSlug, clearPluginSettingsBase, clearPostSamplingHooks, clearRegion, clearShellHistoryCache (batch 5)
- clearToolSchemaCache, cloneDeep, commandHasAnyCd, completeAgentTask, computeNextCronRun, countAndSortItems, createActivityDescriptionResolver, createAxiosInstance (batch 6)
- createContentSummary, createMemorySavedMessage, createModelSwitchBreadcrumbs, createPermissionRetryMessage, createProgressTracker, createScheduledTaskFireMessage, createSyntheticOutputTool, cronToHuman (batch 7)
- defineVendor, deleteSessionEnvVar, dequeueAll, dequeuePendingNotification, detectCodeIndexingFromMcpTool, difference, drainSdkEvents, dropTextInBriefTurns (batch 8)
- defineAnthropicProxy, defineBrand, defineCatalog, defineGateway, defineModel, enqueueAgentNotification, ensureConfigScope, ensureMdmSettingsLoaded (batch 9)
- extractArgsAfterDoubleDash, extractCacheMetrics, extractCacheReadFromRawUsage, extractFirstPromptFromHead, extractAgentIdsFromMessages (batch 10)
- ensureTransport, escapeXmlAttr, escapeRegExp (batch 11 - terminal/xml utilities)
- da1, da2, decrqm (batch 12 - terminal querier)

## 已确认 0 引用但删除后测试失败（不能删）

| 函数 | 文件 | 原因 |
|------|------|------|
| estimateWithBounds | src/services/tokenEstimation.ts | 动态调用 |
| externalMetadataToAppState | src/state/onChangeAppState.ts | 动态调用 |
| extractPromptDescription | src/utils/permissions/bashClassifier.ts | 动态调用 |
| eraseLine/eraseScreen/eraseToEnd* 等6个 | src/ink/termio/csi.ts | 终端底层函数 |
| escapeXmlAttr | src/utils/xml.ts | XML转义 |
| escapeRegExp | - | 正则转义 |
| ensureTransport | src/services/mcp/utils.ts | MCP传输 |

## 待确认候选

