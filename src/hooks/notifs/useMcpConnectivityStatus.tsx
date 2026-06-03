import { c as _c } from "react-compiler-runtime";
import * as React from 'react';
import { logError } from '../../utils/log.js';
import { useEffect } from 'react';
import { useNotifications } from 'src/context/notifications.js';
import { Text } from '../../ink.js';
import type { MCPServerConnection } from '../../services/mcp/types.js';
type Props = {
  mcpClients?: MCPServerConnection[];
};
const EMPTY_MCP_CLIENTS: MCPServerConnection[] = [];
export function useMcpConnectivityStatus(t0) {
  const $ = _c(4);
  const {
    mcpClients: t1
  } = t0;
  const mcpClients = t1 === undefined ? EMPTY_MCP_CLIENTS : t1;
  const {
    addNotification
  } = useNotifications();
  let t2;
  let t3;
  if ($[0] !== addNotification || $[1] !== mcpClients) {
    t2 = () => {
      try {
        const failedClients = mcpClients.filter(_temp);
        const needsAuthServers = mcpClients.filter(_temp3);
        if (failedClients.length === 0 && needsAuthServers.length === 0) {
          return;
        }
        if (failedClients.length > 0) {
          addNotification({
            key: "mcp-failed",
            jsx: <><Text color="error">{failedClients.length} MCP{" "}{failedClients.length === 1 ? "server" : "servers"} failed</Text><Text dimColor={true}> · /mcp</Text></>,
            priority: "medium"
          });
        }
        if (needsAuthServers.length > 0) {
          addNotification({
            key: "mcp-needs-auth",
            jsx: <><Text color="warning">{needsAuthServers.length} MCP{" "}{needsAuthServers.length === 1 ? "server needs" : "servers need"}{" "}auth</Text><Text dimColor={true}> · /mcp</Text></>,
            priority: "medium"
          });
        }
      } catch (error) {
        logError(error);
      }
    };
    t3 = [addNotification, mcpClients];
    $[0] = addNotification;
    $[1] = mcpClients;
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  useEffect(t2, t3);
}
function _temp3(client_1) {
  return client_1.type === "needs-auth";
}
function _temp(client) {
  return client.type === "failed" && client.config.type !== "sse-ide" && client.config.type !== "ws-ide";
}
