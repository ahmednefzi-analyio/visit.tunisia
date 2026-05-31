import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, ChatMessage, Coordinates, MapMarkerData } from './types';
import { DEFAULT_CENTER } from './constants';
import { initializeGenAI, sendMessageToGemini } from './services/geminiService';
import { MapComponent } from './components/MapComponent';
import { ChatInterface } from './components/ChatInterface';
import { WeatherWidget } from './components/WeatherWidget';
import { X, Search, MapPin, Calendar, Star } from 'lucide-react';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return (
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (import.meta as any).env?.VITE_API_KEY ||
      process.env.API_KEY ||
      process.env.GEMINI_API_KEY ||
      null
    );
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.MAPS);
  const [chatInput, setChatInput] = useState('');
  
  // Map State
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_CENTER);
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);
  
  // UI State
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Initialize API
  useEffect(() => {
    if (apiKey) {
      initializeGenAI(apiKey);
    }
  }, [apiKey]);

  // Geolocation
  useEffect(() => {
    // We optionally fetch geolocation if we want, but default to Dougga.
  }, []);

  // Listen for the custom 'discover' event
  useEffect(() => {
    const handleDiscoverClick = () => {
      // Pick another archaeological location in NW Tunisia (e.g. Bulla Regia)
      setMapCenter({ lat: 36.5583, lng: 8.7563 });
      setCurrentMode(AppMode.MAPS);
      setIsMobileChatOpen(false);
      setMarkers([]);
    };
    
    window.addEventListener('map-discover-click', handleDiscoverClick);
    return () => window.removeEventListener('map-discover-click', handleDiscoverClick);
  }, []);

  const handleSendMessage = useCallback(async (text: string, modeOverride?: AppMode, isEventSearch: boolean = false) => {
    if (!apiKey) return;

    const activeMode = modeOverride || currentMode;
    if (modeOverride && modeOverride !== currentMode) {
      setCurrentMode(modeOverride);
    }

    // Prepare prompt
    let promptToSend = text;
    if (isEventSearch) {
      // Clear existing markers when starting a new search
      setMarkers([]);
      promptToSend += `\n\nIMPORTANT: Focus ONLY on the exact local area (coordinates) I have selected. Do not search far away. If there are NO relevant results available exactly in this area, you must say: "Not available in this area, try to search for another area." and set "found" to false in the JSON. If there are results, set "found" to true.
After your text response, you MUST provide a JSON code block. 
The format should be:
\`\`\`json
{
  "found": true,
  "markers": [
    { "title": "Name", "lat": 12.34, "lng": 56.78, "type": "event|archaeological|clothes|coffee", "description": "Date & Time/History/Details", "price": "Optional Price/Rating" }
  ]
}
\`\`\`
Type can be 'event', 'archaeological', 'clothes', or 'coffee'. STRICT RULE: Only return the type that specifically matches my request category. DO NOT mix categories.`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const contextLocation = mapCenter;

    const response = await sendMessageToGemini(
      promptToSend,
      activeMode,
      messages, 
      contextLocation
    );

    // Parse markers if present
    let displayText = response.text;
    let showDiscoverButton = false;
    const jsonBlockRegex = /```json\s*({[\s\S]*?})\s*```/;
    const match = response.text.match(jsonBlockRegex);

    if (match && match[1]) {
      try {
        const data = JSON.parse(match[1]);
        if (data.found === false || (data.markers && data.markers.length === 0)) {
           showDiscoverButton = true;
        } else if (data.markers && Array.isArray(data.markers)) {
          const newMarkers = data.markers.map((m: any, idx: number) => ({
            id: `marker-${Date.now()}-${idx}`,
            lat: m.lat,
            lng: m.lng,
            title: m.title,
            type: m.type,
            description: m.description,
            price: m.price
          }));
          setMarkers(newMarkers);
        }
        // Remove JSON block from display text to keep UI clean
        displayText = response.text.replace(match[0], '').trim();
      } catch (e) {
        console.error("Failed to parse marker JSON", e);
      }
    } else if (isEventSearch && (displayText.toLowerCase().includes("not available"))) {
        showDiscoverButton = true;
    }

    setMessages(prev => [...prev, { ...response, text: displayText, showDiscoverButton }]);
    setIsLoading(false);
  }, [apiKey, currentMode, messages, mapCenter]);

  const handleCategorySearch = useCallback((categoryType: string) => {
    setIsMenuOpen(false);
    let searchPrompt = "";
    let modeToUse = AppMode.MAPS;
    if (categoryType === 'archaeological') {
        searchPrompt = "Find archaeological areas exactly in this location in Northwest Tunisia. Show their entry prices and historical information. STRICT REQUIREMENT: DO NOT provide information or markers for coffee shops, events, or traditional clothes.";
    } else if (categoryType === 'events') {
        searchPrompt = "Find upcoming events starting from tomorrow exactly in this area in Northwest Tunisia. Include dates and times. STRICT REQUIREMENT: DO NOT provide information or markers for archaeological sites, coffee shops, or traditional clothes.";
    } else if (categoryType === 'clothes') {
        searchPrompt = "Search for and provide detailed information on the known traditional clothes specific to this exact area in Northwest Tunisia. Include deeply detailed historical background, dates, and what they look like. You MUST search to find REAL image URLs (e.g. from Wikimedia Commons ending in .jpg) and include them using Markdown syntax: `![Clothing Name](valid_image_url)`. It is critical the photos appear! Show map markers for museums, cultural centers, or artisan shops where you can find or experience them. STRICT REQUIREMENT: DO NOT provide information or markers for any other categories like coffee shops, events, or archaeological sites.";
        modeToUse = AppMode.SEARCH; // Better for retrieving text details and images
    } else if (categoryType === 'coffee') {
        searchPrompt = "Find the most highly rated coffee shops exactly in this area in Northwest Tunisia. Include their ratings and reviews. STRICT REQUIREMENT: DO NOT provide information or markers for archaeological sites, events, or traditional clothes.";
    }
    
    handleSendMessage(searchPrompt, modeToUse, true);
  }, [handleSendMessage]);

  const handleMarkerClick = useCallback((marker: MapMarkerData) => {
    let prompt = "";
    if (marker.type === 'event') {
      prompt = `Tell me more details about the event "${marker.title}" happening nearby in Northwest Tunisia.`;
    } else if (marker.type === 'clothes') {
      prompt = `Search for and provide detailed information, intensely detailed historical dates, and background about the traditional clothes associated with or found at "${marker.title}" in Northwest Tunisia. You MUST include markdown photos/images: \`![Name](actual_image_url)\`.`;
    } else if (marker.type === 'coffee') {
      prompt = `Provide detailed reviews, ambiance, and information about the coffee shop "${marker.title}" in Northwest Tunisia.`;
    } else {
      prompt = `Provide historical information and the entry price for the archaeological area "${marker.title}" in Northwest Tunisia.`;
    }
    
    setChatInput(prompt);
    setIsMobileChatOpen(true);
  }, []);

  // If no API key is present
  if (!apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-slate-800 dark:text-slate-100 font-sans">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-150 dark:border-slate-800 transition-all">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-100/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight mb-2">Gemini API Key Required</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            The application is hosted successfully! To power our regional heritage exploration and chatbot recommendations, please configure your Gemini API Key.
          </p>
          
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1">Vercel Setup Instructions</h2>
            
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-xs font-semibold text-blue-600">1</span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Open your Vercel Dashboard</p>
                <p className="text-xs text-slate-400">Navigate to your project's settings page.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-xs font-semibold text-blue-600">2</span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Add Environment Variable</p>
                <p className="text-xs text-slate-400">
                  Add <code className="font-mono bg-slate-100 dark:bg-slate-800 text-blue-600 px-1 rounded text-[11px] font-semibold">GEMINI_API_KEY</code> or <code className="font-mono bg-slate-100 dark:bg-slate-800 text-blue-600 px-1 rounded text-[11px] font-semibold">VITE_GEMINI_API_KEY</code> as the key.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-xs font-semibold text-blue-600">3</span>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Redeploy your App</p>
                <p className="text-xs text-slate-400">Re-run the build sequence or deploy your latest commit. The app will launch 100% instantly!</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              Get Gemini API Key
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">GeoGuide AI Offline-Capactive Map</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col md:flex-row">
      
      {/* Mobile Header / Toggle */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none flex justify-end">
         <button
          onClick={() => setIsMobileChatOpen(!isMobileChatOpen)}
          className="pointer-events-auto bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400"
        >
          {isMobileChatOpen ? <X size={24} /> : <MessageSquareIcon />}
        </button>
      </div>

      {/* Map Section */}
      <div className="w-full h-full md:w-2/3 lg:w-3/4 absolute md:relative z-0">
        <MapComponent 
          center={mapCenter} 
          userLocation={userLocation} 
          markers={markers}
          onCenterChange={setMapCenter}
          onMarkerClick={handleMarkerClick}
        />
        
        {/* Hamburger Menu Overlay */}
        <div className="absolute top-6 left-14 z-[400] pointer-events-auto">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors focus:outline-none"
          >
            {isMenuOpen ? <X size={20} /> : <Search size={20} />}
            <span className="font-medium text-sm hidden sm:inline">Search Categories</span>
          </button>
          
          {isMenuOpen && (
             <div className="absolute top-14 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
               <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-xs text-slate-500 uppercase tracking-wider">
                 Categories
               </div>
               <button onClick={() => handleCategorySearch('archaeological')} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                 Archaeological Areas
               </button>
               <button onClick={() => handleCategorySearch('events')} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200">
                 <Calendar size={18} className="text-orange-500" /> Upcoming Events
               </button>
               <button onClick={() => handleCategorySearch('clothes')} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg> 
                 Traditional Clothes
               </button>
               <button onClick={() => handleCategorySearch('coffee')} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-left text-sm text-slate-700 dark:text-slate-200">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8v-3"/><path d="M6 2v2"/></svg>
                 Top Coffee Shops
               </button>
             </div>
          )}
        </div>

        {/* Weather Widget */}
        <div className="absolute top-6 right-6 z-[400]">
          <WeatherWidget location={mapCenter} />
        </div>

        {/* Map Coordinates Badge */}
        <div className="absolute bottom-6 left-4 z-[400] pointer-events-none">
           <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-2">
             <MapPin size={12} className="text-slate-400" />
             <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
               {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
             </span>
           </div>
        </div>
      </div>

      {/* Chat Section */}
      <div 
        className={`
          absolute md:relative z-[500] 
          w-full md:w-1/3 lg:w-1/4 h-[85vh] md:h-full bottom-0 
          transition-transform duration-300 ease-in-out
          ${isMobileChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}
          md:translate-y-0
          bg-transparent pointer-events-none md:pointer-events-auto
          flex flex-col justify-end md:justify-start
        `}
      >
        <div className="h-full pointer-events-auto p-4 md:p-0 md:border-l border-gray-200 dark:border-gray-800 bg-transparent md:bg-white md:dark:bg-slate-900">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            currentMode={currentMode}
            onSend={(text) => handleSendMessage(text, undefined, false)}
            onModeChange={setCurrentMode}
            inputValue={chatInput}
            onInputChange={setChatInput}
          />
        </div>
      </div>
    </div>
  );
};

const MessageSquareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default App;