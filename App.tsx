import React, { useState, useEffect, useCallback } from 'react';
import { 
  AppMode, 
  ChatMessage, 
  Coordinates, 
  MapMarkerData, 
  UserProfile, 
  SavedPlace, 
  Conversation 
} from './types';
import { DEFAULT_CENTER } from './constants';
import { initializeGenAI, sendMessageToGemini } from './services/geminiService';
import { MapComponent } from './components/MapComponent';
import { ChatInterface } from './components/ChatInterface';
import { WeatherWidget } from './components/WeatherWidget';
import { LandingPage } from './components/LandingPage';
import { ProfileModal } from './components/ProfileModal';
import { ReviewsSection } from './components/ReviewsSection';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType 
} from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy
} from 'firebase/firestore';
import { 
  X, 
  Search, 
  MapPin, 
  Calendar, 
  Compass,
  Sparkles,
  Bookmark,
  ChevronRight,
  LogOut,
  FolderOpen,
  Save,
  Trash2,
  Users2
} from 'lucide-react';

const App: React.FC = () => {
  // Auth state
  const [userUid, setUserUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // App parameters
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.MAPS);
  const [chatInput, setChatInput] = useState('');
  
  // Map parameters
  const [mapCenter, setMapCenter] = useState<Coordinates>({ lat: 36.8524, lng: 10.3344 }); // Carthage defaulted
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);

  // UI tabs navigation
  const [activeDeckTab, setActiveDeckTab] = useState<'chat' | 'reviews' | 'footprints'>('chat');

  // Footprints/Saved Places creation flows
  const [clickedCoords, setClickedCoords] = useState<Coordinates | null>(null);
  const [footprintTitle, setFootprintTitle] = useState('');
  const [footprintDesc, setFootprintDesc] = useState('');
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  // Conversations history saving flows
  const [savedConvs, setSavedConvs] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        
        // Fetch or seed profile details
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const seedProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Tunisian Explorer',
              email: user.email || '',
              bio: "Passionate traveler looking forward to cataloguing Carthagenian ruins on Memoria.",
              mood: "Archaeological"
            };
            await setDoc(docRef, seedProfile);
            setProfile(seedProfile);
          }
        } catch (err) {
          console.error("Error setting up profile:", err);
        }
      } else {
        setUserUid(null);
        setProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch individual's Saved Footprints and Historic Chats
  const loadUserData = useCallback(async (uid: string) => {
    setPlacesLoading(true);
    try {
      // 1. Fetch Saved Places (Subcollection)
      const placesSnap = await getDocs(collection(db, 'userProfiles', uid, 'savedPlaces'));
      const listPlaces: SavedPlace[] = [];
      placesSnap.forEach((docSnap) => {
        listPlaces.push(docSnap.data() as SavedPlace);
      });
      setSavedPlaces(listPlaces);

      // 2. Fetch Conversations (Query with Owner constraint)
      const q = query(
        collection(db, 'conversations'), 
        where('userId', '==', uid)
      );
      const convSnap = await getDocs(q);
      const listConvs: Conversation[] = [];
      convSnap.forEach((docSnap) => {
        listConvs.push(docSnap.data() as Conversation);
      });
      setSavedConvs(listConvs);
    } catch (err) {
      console.warn("Notice: Standard auth profile or database seeding in progress.");
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userUid) {
      loadUserData(userUid);
    }
  }, [userUid, loadUserData]);

  // Handle Log Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserUid(null);
      setProfile(null);
      setMessages([]);
      setMarkers([]);
      setSavedPlaces([]);
      setSavedConvs([]);
      setActiveConvId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Click Map callback
  const handleMapClick = useCallback((coords: Coordinates) => {
    setClickedCoords(coords);
    setFootprintTitle('');
    setFootprintDesc('');
    // Focus or expand tab to bookmarks/footprints for prompt alignment
    setActiveDeckTab('footprints');
  }, []);

  // Set default markers on load of Northwest landmarks or Tunisia landmarks
  useEffect(() => {
    if (userUid) {
      // Initialize with beautiful pre-configured Tunisia heritage coordinates
      setMarkers([
        {
          id: 'carthage-antonine',
          lat: 36.8547,
          lng: 10.3341,
          title: 'Antonine Baths (Carthage)',
          type: 'archaeological',
          description: 'The largest Roman baths ruins in Africa, boasting gorgeous coastal views.',
          price: '12 TND'
        },
        {
          id: 'dougga-theatre',
          lat: 36.4221,
          lng: 9.2201,
          title: 'Roman Theatre of Dougga',
          type: 'archaeological',
          description: 'A monumentally preserved UNESCO theatre accommodating up to 3500 spectators.',
          price: '8 TND'
        },
        {
          id: 'sidi-bou-said',
          lat: 36.8708,
          lng: 10.3411,
          title: 'Sidi Bou Said Art Medina',
          type: 'clothes',
          description: 'Fabled blue and white alleys and vibrant Tunisian artisan workshops.',
          price: 'Free entry'
        },
        {
          id: 'el-jem-coliseum',
          lat: 35.2964,
          lng: 10.7067,
          title: 'Amphitheatre of El Jem',
          type: 'archaeological',
          description: 'Colossal, well-preserved Roman amphitheater rivaling the Roman Colosseum.',
          price: '10 TND'
        }
      ]);
    }
  }, [userUid]);

  // Trigger Gemini AI interaction message with Express proxy
  const handleSendMessage = useCallback(async (text: string, modeOverride?: AppMode, isEventSearch: boolean = false) => {
    if (!userUid) return;

    const activeMode = modeOverride || currentMode;
    if (modeOverride && modeOverride !== currentMode) {
      setCurrentMode(modeOverride);
    }

    let promptToSend = text;
    if (isEventSearch) {
      setMarkers([]);
      promptToSend += `\n\nIMPORTANT: Focus on monuments and events in this Tunisia tourism coordinate area. After your text response, you MUST provide a JSON code block in this schema:
\`\`\`json
{
  "found": true,
  "markers": [
    { "title": "Location Name", "lat": 12.34, "lng": 56.78, "type": "event|archaeological|clothes|coffee", "description": "Short historical details", "price": "e.g. 5 TND" }
  ]
}
\`\`\`
Type can only be 'event', 'archaeological', 'clothes', or 'coffee'.`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    const contextLocation = mapCenter;

    try {
      const response = await sendMessageToGemini(
        promptToSend,
        activeMode,
        updatedMessages, 
        contextLocation
      );

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
              lat: Number(m.lat),
              lng: Number(m.lng),
              title: m.title,
              type: m.type,
              description: m.description,
              price: m.price
            }));
            setMarkers(newMarkers);
          }
          displayText = response.text.replace(match[0], '').trim();
        } catch (e) {
          console.error("Failed to parse marker JSON", e);
        }
      }

      setMessages(prev => [...prev, { ...response, text: displayText, showDiscoverButton }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [userUid, currentMode, messages, mapCenter]);

  // Handle Left Category buttons
  const handleCategorySearch = useCallback((categoryType: string) => {
    let searchPrompt = "";
    let modeToUse = AppMode.MAPS;

    if (categoryType === 'archaeological') {
      searchPrompt = "Locate amazing UNESCO and Roman archaeological coordinate ruins in this part of Tunisia.";
    } else if (categoryType === 'events') {
      searchPrompt = "Are there any local events, tour offerings, festivals, or folklore happenings here in Tunisia?";
    } else if (categoryType === 'clothes') {
      searchPrompt = "Describe the traditional Tunisian clothing styles (like chechia, Jebba, or Sefseri) found around this area.";
      modeToUse = AppMode.SEARCH;
    } else if (categoryType === 'coffee') {
      searchPrompt = "Search for outstanding traditional Tunisian tea or coffee houses around these coordinates.";
    }
    
    handleSendMessage(searchPrompt, modeToUse, true);
  }, [handleSendMessage]);

  const handleMarkerClick = useCallback((marker: MapMarkerData) => {
    let prompt = `Provide historical context and the entry value of "${marker.title}" in Tunisia.`;
    setChatInput(prompt);
  }, []);

  // Save footprint / Saved Place Creation
  const handleSaveFootprint = async () => {
    if (!userUid || !clickedCoords || !footprintTitle.trim()) return;

    const placeId = `place_${Date.now()}`;
    const newPlace: SavedPlace = {
      id: placeId,
      userId: userUid,
      title: footprintTitle.trim(),
      lat: clickedCoords.lat,
      lng: clickedCoords.lng,
      type: 'archaeological',
      description: footprintDesc.trim() || 'Custom pinpointed tourist coordinates on Memoria.'
    };

    try {
      const placePath = `userProfiles/${userUid}/savedPlaces/${placeId}`;
      await setDoc(doc(db, 'userProfiles', userUid, 'savedPlaces', placeId), newPlace);
      
      // Update local state
      setSavedPlaces(prev => [...prev, newPlace]);
      setClickedCoords(null);
      setFootprintTitle('');
      setFootprintDesc('');
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, `userProfiles/${userUid}/savedPlaces/${placeId}`);
    }
  };

  // Delete Footprint / Saved Place
  const handleDeletePlace = async (placeId: string) => {
    if (!userUid) return;
    try {
      await deleteDoc(doc(db, 'userProfiles', userUid, 'savedPlaces', placeId));
      setSavedPlaces(prev => prev.filter(p => p.id !== placeId));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `userProfiles/${userUid}/savedPlaces/${placeId}`);
    }
  };

  // Save Chat / Conversation Session
  const handleSaveConversation = async () => {
    if (!userUid || messages.length === 0) return;

    const convId = activeConvId || `conv_${Date.now()}`;
    const firstMsg = messages.find(m => m.role === 'user')?.text || 'Travel Session Log';
    const convTitle = firstMsg.length > 25 ? firstMsg.substring(0, 25) + "..." : firstMsg;

    const conversationDoc: Conversation = {
      id: convId,
      userId: userUid,
      title: convTitle,
      messages: messages,
      updatedAt: new Date()
    };

    try {
      const convPath = `conversations/${convId}`;
      await setDoc(doc(db, 'conversations', convId), conversationDoc);
      
      setActiveConvId(convId);
      
      // Refresh local saved list
      setSavedConvs(prev => {
        if (prev.some(c => c.id === convId)) {
          return prev.map(c => c.id === convId ? conversationDoc : c);
        } else {
          return [...prev, conversationDoc];
        }
      });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, `conversations/${convId}`);
    }
  };

  // Load Saved Chat
  const handleLoadConversation = (conv: Conversation) => {
    setMessages(conv.messages);
    setActiveConvId(conv.id);
    setActiveDeckTab('chat');
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setActiveConvId(null);
    setChatInput('');
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col justify-center items-center bg-slate-50 text-slate-500 font-sans gap-2">
        <Compass className="w-10 h-10 animate-spin text-teal-600" />
        <span className="text-xs font-mono tracking-wider uppercase font-bold text-slate-400">Bootstrapping Memoria Maps...</span>
      </div>
    );
  }

  // FORCE ACCESS AFTER SIGN IN
  if (!userUid) {
    return <LandingPage onAuthSuccess={(uid) => setUserUid(uid)} />;
  }

  const userMoodLabel = profile ? profile.mood : 'Archaeological';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans">
      
      {/* 1. VISUALLY POLISHED HEADER */}
      <header className="w-full bg-white border-b border-slate-150 px-6 py-4 flex items-center justify-between z-50 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="p-1 px-2.5 bg-teal-600 rounded-xl text-white text-xs font-serif font-bold italic shadow-sm tracking-wide">
            memoria
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono hidden sm:inline-block border-l border-slate-200 pl-3">
            Northwest Tunisia Heritage Nav
          </span>
        </div>

        <div className="flex items-center gap-4">
          
          {/* Active profile button */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 px-3 py-1.5 rounded-xl transition text-xs font-semibold text-slate-700"
          >
            <Users2 size={14} className="text-teal-600" />
            <span className="hidden sm:inline">Explorer Hub</span>
            <span className="px-1.5 py-0.5 bg-teal-500 text-white rounded text-[9px] font-bold">
              {userMoodLabel}
            </span>
          </button>

          <button
            onClick={handleSignOut}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 rounded-xl transition"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* 2. THREE-PANEL CORE INTERACTION SECTION */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* LEAFLET CANVAS PANEL */}
        <div className="flex-1 h-[45vh] md:h-full relative border-r border-slate-150">
          <MapComponent 
            center={mapCenter} 
            userLocation={userLocation} 
            markers={markers}
            onCenterChange={setMapCenter}
            onMarkerClick={handleMarkerClick}
            onMapClick={handleMapClick}
          />

          {/* Quick Categories HUD */}
          <div className="absolute top-4 left-4 z-[400] flex gap-2">
            <button 
              onClick={() => handleCategorySearch('archaeological')}
              className="bg-white/95 backdrop-blur shadow-sm hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1 transition"
            >
              🏺 Ruins
            </button>
            <button 
              onClick={() => handleCategorySearch('events')}
              className="bg-white/95 backdrop-blur shadow-sm hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1 transition"
            >
              🎭 Folklore
            </button>
            <button 
              onClick={() => handleCategorySearch('clothes')}
              className="bg-white/95 backdrop-blur shadow-sm hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1 transition"
            >
              🧵 Apparel
            </button>
            <button 
              onClick={() => handleCategorySearch('coffee')}
              className="bg-white/95 backdrop-blur shadow-sm hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 flex items-center gap-1 transition"
            >
              ☕ Cafe
            </button>
          </div>

          {/* Weather Widget float */}
          <div className="absolute top-4 right-4 z-[400] hidden lg:block">
            <WeatherWidget location={mapCenter} />
          </div>
        </div>

        {/* DECKS PANE CONTROL (TABBED NAVIGATION INTERACTIVE FOR MULTI-MODULE) */}
        <div className="w-full md:w-[380px] lg:w-[440px] shrink-0 bg-slate-50 flex flex-col border-t md:border-t-0 border-slate-150">
          
          {/* Deck Tabs */}
          <div className="flex border-b border-slate-150 bg-white">
            <button
              onClick={() => setActiveDeckTab('chat')}
              className={`flex-1 text-center py-3.5 text-xs font-bold border-b-2 transition ${
                activeDeckTab === 'chat' 
                  ? 'border-indigo-600 text-slate-900 bg-slate-50/40' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              💬 Concierge AI
            </button>

            <button
              onClick={() => setActiveDeckTab('reviews')}
              className={`flex-1 text-center py-3.5 text-xs font-bold border-b-2 transition ${
                activeDeckTab === 'reviews' 
                  ? 'border-indigo-600 text-slate-900 bg-slate-50/40' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              ⭐ Reviews Feed
            </button>

            <button
              onClick={() => setActiveDeckTab('footprints')}
              className={`flex-1 text-center py-3.5 text-xs font-bold border-b-2 transition ${
                activeDeckTab === 'footprints' 
                  ? 'border-indigo-600 text-slate-900 bg-slate-50/40' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🔖 Saved Trails ({savedPlaces.length})
            </button>
          </div>

          {/* Tab Modules Content render */}
          <div className="flex-1 overflow-hidden relative">
            
            {/* MODULE 1: AI CONCIERGE CHAT */}
            {activeDeckTab === 'chat' && (
              <div className="h-full flex flex-col bg-white">
                
                {/* Active Chat Control HUD */}
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400 font-mono font-semibold shrink-0">
                  <span>
                    {activeConvId ? "📁 Persistent Travel Session Cached" : "⚡ Standby Travel Log"}
                  </span>
                  
                  <div className="flex gap-2">
                    {messages.length > 0 && (
                      <button
                        onClick={handleSaveConversation}
                        className="text-indigo-600 hover:underline flex items-center gap-0.5 font-bold"
                        title="Save conversation securely to Firestore"
                      >
                        <Save size={11} className="mr-0.5" /> Save Session
                      </button>
                    )}
                    <button
                      onClick={handleStartNewChat}
                      className="text-slate-600 hover:underline hover:text-slate-700 font-bold"
                    >
                      + Reset Chat
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
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
            )}

            {/* MODULE 2: TRAVEL REVIEWS FEED */}
            {activeDeckTab === 'reviews' && (
              <div className="h-full bg-white">
                <ReviewsSection 
                  currentUid={userUid} 
                  userDisplayName={profile?.displayName || 'Travel Explorer'} 
                />
              </div>
            )}

            {/* MODULE 3: SAVED COORDINATES FOOTPRINTS */}
            {activeDeckTab === 'footprints' && (
              <div className="h-full flex flex-col p-6 overflow-y-auto bg-white space-y-6">
                
                {/* Save new footprints dropped pin */}
                {clickedCoords ? (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-3 shrink-0">
                    <h4 className="text-xs font-bold text-teal-800 flex items-center gap-1">
                      <Sparkles size={14} className="text-teal-600" /> Save Captured Pin
                    </h4>
                    <p className="text-[10px] text-teal-600 font-mono">
                      Coordinates: {clickedCoords.lat.toFixed(5)}, {clickedCoords.lng.toFixed(5)}
                    </p>

                    <div className="space-y-2">
                      <input 
                        type="text"
                        required
                        placeholder="Name of this destination... (e.g. Sidi Bou Said Tea Room)"
                        value={footprintTitle}
                        onChange={(e) => setFootprintTitle(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                      />
                      <textarea
                        placeholder="Add private commentary or guide notes..."
                        value={footprintDesc}
                        onChange={(e) => setFootprintDesc(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={handleSaveFootprint}
                        className="flex-1 bg-teal-600 text-white text-xs font-bold py-2 rounded-xl hover:opacity-95 transition"
                      >
                        Keep Footprint
                      </button>
                      <button
                        onClick={() => setClickedCoords(null)}
                        className="px-3 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-light leading-relaxed">
                    💡 <strong>Tip:</strong> Click anywhere on the map to drop a footprint PIN, then log it here to back it up to your account.
                  </div>
                )}

                {/* Lists of saved coordinates */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider block">My Saved Coordinates Trail</h4>
                  
                  {placesLoading ? (
                    <div className="text-center py-6 text-xs text-slate-400">Loading saved tracks...</div>
                  ) : savedPlaces.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 font-light italic">
                      No bookmarks logged on this trace yet. Click map coordinates to drop pin.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedPlaces.map((p) => (
                        <div 
                          key={p.id}
                          className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition"
                        >
                          <button
                            onClick={() => setMapCenter({ lat: p.lat, lng: p.lng })}
                            className="flex-1 text-left"
                            title="Fly map to coordinates"
                          >
                            <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                              <MapPin size={12} className="text-indigo-600 shrink-0" />
                              {p.title}
                            </h5>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 italic font-light">
                              {p.description}
                            </p>
                          </button>

                          <button
                            onClick={() => handleDeletePlace(p.id)}
                            className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lists of historic saved sessions */}
                {savedConvs.length > 0 && (
                  <div className="pt-4 border-t border-slate-150 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Historic Travel Conversations</h4>
                    <div className="space-y-1.5">
                      {savedConvs.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleLoadConversation(c)}
                          className={`w-full text-left text-xs p-2 rounded-xl transition border flex items-center justify-between ${
                            activeConvId === c.id 
                              ? 'bg-indigo-50/50 border-indigo-200 text-indigo-800 font-semibold' 
                              : 'bg-white hover:bg-slate-50 border-slate-150 text-slate-600'
                          }`}
                        >
                          <span className="truncate">{c.title}</span>
                          <ChevronRight size={12} className="shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

      </div>

      {/* 3. PROFILE EXPLORER MODAL ELEMENT */}
      {isProfileOpen && (
        <ProfileModal 
          currentUid={userUid} 
          onClose={() => {
            setIsProfileOpen(false);
            // Re-fetch profile in case mood changed to refresh badge info
            const refresh = async () => {
              const docSnap = await getDoc(doc(db, 'userProfiles', userUid));
              if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
              }
            };
            refresh();
          }} 
        />
      )}

    </div>
  );
};

export default App;
