/**
 * Parses a time string in MM:SS format and converts it to total seconds
 * @param timeString - Time string in format "MM:SS" (e.g., "01:30" for 1 minute 30 seconds)
 * @returns Total number of seconds
 * @example
 * ```typescript
 * parseTimeString("01:30"); // Returns 90 (1 minute 30 seconds)
 * parseTimeString("00:45"); // Returns 45 (45 seconds)
 * parseTimeString("10:00"); // Returns 600 (10 minutes)
 * ```
 */
export function parseTimeString(timeString: string): number {
  const parts = timeString.split(':');
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  return minutes * 60 + seconds;
}

/**
 * Waits for WebSocket disconnection by monitoring console messages for specific disconnection indicators
 * @param consoleMessages - Array of console messages to monitor
 * @param timeoutMs - Maximum time to wait for disconnection in milliseconds (default: 15000)
 * @returns Promise<boolean> - True if disconnection is detected, false if timeout is reached
 * @description Monitors for network disconnection messages or WebSocket offline status changes
 * @example
 * ```typescript
 * consoleMessages.length = 0; // Clear existing messages
 * await page.context().setOffline(true);
 * const isDisconnected = await waitForWebSocketDisconnection(consoleMessages);
 * expect(isDisconnected).toBe(true);
 * ```
 */
export async function waitForWebSocketDisconnection(consoleMessages: string[], timeoutMs: number = 15000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const webSocketDisconnectLog = consoleMessages.find(
      (msg) =>
        msg.includes('Failed to load resource: net::ERR_INTERNET_DISCONNECTED') ||
        msg.includes('[WebSocketStatus] event=checkOnlineStatus | online status= false')
    );
    if (webSocketDisconnectLog) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

/**
 * Waits for WebSocket reconnection by monitoring console messages for online status changes
 * @param consoleMessages - Array of console messages to monitor
 * @param timeoutMs - Maximum time to wait for reconnection in milliseconds (default: 15000)
 * @returns Promise<boolean> - True if reconnection is detected, false if timeout is reached
 * @description Monitors for WebSocket online status change messages indicating successful reconnection
 * @example
 * ```typescript
 * consoleMessages.length = 0; // Clear existing messages
 * await page.context().setOffline(false);
 * const isReconnected = await waitForWebSocketReconnection(consoleMessages);
 * expect(isReconnected).toBe(true);
 * ```
 */
export async function waitForWebSocketReconnection(consoleMessages: string[], timeoutMs: number = 15000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const webSocketReconnectLog = consoleMessages.find((msg) =>
      msg.includes('[WebSocketStatus] event=checkOnlineStatus | online status= true')
    );
    if (webSocketReconnectLog) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}