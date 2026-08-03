import RoomShell from './RoomShell';
import type { RoomId } from '@/types/rooms';

interface RoomTemplateProps {
  roomId: RoomId;
}

export default function RoomTemplate({ roomId }: RoomTemplateProps) {
  return <RoomShell roomId={roomId} />;
}
