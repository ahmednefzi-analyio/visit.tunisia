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

// Custom Memoria Profiles and Communities
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio: string;
  mood: string; // active state mood: e.g. "Archaeological" | "Culinary" | "Culinary & Culture" | "Beach Resort"
  createdAt?: any;
}

export interface SavedPlace {
  id: string;
  userId: string;
  title: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
  createdAt?: any;
}

export interface Review {
  id: string;
  userId: string;
  userDisplayName: string;
  placeTitle: string;
  rating: number; // 1 to 5 stars
  text: string;
  createdAt?: any;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt?: any;
}

export interface Friendship {
  id: string; // composite senderUid_receiverUid or doc ID
  senderUid: string;
  receiverUid: string;
  senderName: string;
  receiverName: string;
  status: 'pending' | 'accepted' | 'declined';
  updatedAt?: any;
}
