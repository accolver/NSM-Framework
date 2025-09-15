// Core NSM type definitions - placeholder for now
export interface NSMEvent {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  tags: string[][];
  content: string;
  sig: string;
}

// Placeholder interfaces - will be implemented in Task 2
export interface NSMDefinitionEvent extends NSMEvent {
  kind: 30079;
}

export interface NSMInteractionEvent extends NSMEvent {
  kind: number; // 7000-7999 range
}

export interface NSMStateUpdateEvent extends NSMEvent {
  kind: 10079;
}