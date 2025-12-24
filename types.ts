export interface ProcessedImage {
  originalData: string; // Base64 data URI
  mimeType: string;
}

export interface GenerationResult {
  imageData: string; // Base64 data URI
  error?: string;
}

export interface HistoryItem {
  image: string;
  prompt: string;
  width: number;
  height: number;
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  READY_TO_EDIT = 'READY_TO_EDIT',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}