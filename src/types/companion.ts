export enum CompanionState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  FOLLOWING = 'FOLLOWING',
  EXCITED = 'EXCITED',
  SURPRISED = 'SURPRISED',
  CELEBRATING = 'CELEBRATING',
}

export type CompanionReactionType =
  | 'wave'
  | 'waving'
  | 'jump'
  | 'jumping'
  | 'laugh'
  | 'laughing'
  | 'cheer'
  | 'cheering'
  | 'excited'
  | 'surprised'
  | 'dance'
  | 'high_five'
  | 'thumbs_up'
  | 'none';

export interface CompanionDialogue {
  id: string;
  speaker: 'child' | 'character';
  text: string;
  emotion?: 'happy' | 'excited' | 'curious' | 'surprised' | 'playful';
  timestamp: number;
}

export interface CompanionReactionEvent {
  state: CompanionState;
  reaction: CompanionReactionType;
  message: string;
  durationMs: number;
  timestamp: number;
}
