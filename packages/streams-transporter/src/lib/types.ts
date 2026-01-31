export type EventType = {
  e: true;
  pattern: unknown;
  data: unknown;
};

export type RequestType = {
  e: false;
  pattern: unknown;
  data: unknown;
  id: string;
  replyTo: string;
};

export type RedisPacket = EventType | RequestType;

export function isEventPacket(packet: RedisPacket): packet is EventType {
  return packet.e === true;
}

export function isRequestPacket(packet: RedisPacket): packet is RequestType {
  return packet.e === false;
}
