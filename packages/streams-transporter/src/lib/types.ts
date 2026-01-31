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

export type RedisPacket = EventType | RequestType;

export function isEventPacket(packet: RedisPacket): packet is EventType {
  return packet.e === '1';
}

export function isRequestPacket(packet: RedisPacket): packet is RequestType {
  return packet.e === '0';
}
