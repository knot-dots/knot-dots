export interface IndexingEvent {
  action: 'upsert' | 'delete';
  guid: string;
  type?: string;
  timestamp: string;
}
