export type EventType = {
  e: '0' | '1';
  data: string;
};

export type RequestType = {
  e: '0' | '1';
  data: string;
  id: string;
  replyTo: string;
};

export type ResponseType = {
  id: string;
  data?: string;
  err?: string;
  isDisposed?: '0' | '1';
};

export type RedisPacket = EventType | RequestType;

export function isEventPacket(
  packet: Record<string, string>,
): packet is EventType {
  return packet.e === '1';
}

export function isRequestPacket(
  packet: Record<string, string>,
): packet is RequestType {
  return packet.e === '0';
}

export function isResponsePacket(
  packet: Record<string, string>,
): packet is ResponseType {
  return typeof packet.id === 'string' && 'isDisposed' in packet;
}
