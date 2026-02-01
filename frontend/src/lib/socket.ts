import { io, Socket } from 'socket.io-client';
import type { WSEvent } from '@/types/websocket';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000/ws';

export function createSocket(): Socket {
  return io(WS_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
  });
}

/**
 * Type-safe event listener wrapper.
 * Registers a handler for a specific websocket event name and provides
 * the correctly typed data payload to the callback.
 */
export function onEvent<E extends WSEvent['event']>(
  socket: Socket,
  event: E,
  handler: (data: Extract<WSEvent, { event: E }>['data']) => void
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on(event, handler as any);
}

/**
 * Type-safe emit wrapper.
 * Sends a message through the socket with the given event name and payload.
 */
export function emitEvent(
  socket: Socket,
  event: string,
  data?: unknown
): void {
  socket.emit(event, data);
}

export type { Socket };
