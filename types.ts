export enum AppMode {
  MAPS = 'MAPS',
  SEARCH = 'SEARCH',
  CHAT = 'CHAT',
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string;
  description?: string;
  price?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isError?: boolean;
  groundingMetadata?: GroundingMetadata;
  showDiscoverButton?: boolean;
}

export interface GroundingMetadata {
  searchChunks?: SearchChunk[];
  mapChunks?: MapChunk[];
}

export interface SearchChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface MapChunk {
  maps: {
    source: {
      uri: string;
    };
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        snippet: string;
        author: string;
      }[];
    }[];
  };
}

export interface AppState {
  messages: ChatMessage[];
  isLoading: boolean;
  userLocation: Coordinates | null;
  mapCenter: Coordinates;
  mode: AppMode;
  apiKey: string | null;
}