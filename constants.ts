import { AppMode, Coordinates } from './types';

export const DEFAULT_CENTER: Coordinates = {
  lat: 36.4225, // Dougga, Northwest Tunisia
  lng: 9.2201,
};

export const MODES = [
  {
    id: AppMode.MAPS,
    label: 'Maps',
    description: 'Find places nearby (Gemini 2.5)',
    icon: 'Map',
  },
  {
    id: AppMode.SEARCH,
    label: 'Search',
    description: 'Web knowledge (Gemini 3 Flash)',
    icon: 'Globe',
  },
  {
    id: AppMode.CHAT,
    label: 'Chat',
    description: 'Complex reasoning (Gemini 3 Pro)',
    icon: 'MessageSquare',
  },
];

export const SYSTEM_INSTRUCTIONS = {
  [AppMode.MAPS]: "You are a specialized location expert focusing EXCLUSIVELY on Northwest Tunisia (Beja, Jendouba, Kef, Siliana). Depending on the request, you can provide top-rated coffee shops, known local traditional clothes categorized by date/history, archaeological sites with entry prices, or local events.",
  [AppMode.SEARCH]: "You are a knowledgeable research assistant for Northwest Tunisia. Use Google Search to find upcoming events (starting from tomorrow), gather pricing/information on archaeological areas, top-rated coffee shops, and deep history on traditional local clothes.",
  [AppMode.CHAT]: "You are a friendly guide for Northwest Tunisia. Answer questions with depth about history, ruins, visiting details, upcoming events, traditional clothing history, and top local places.",
};