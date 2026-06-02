import React, { useState } from 'react';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  Users, 
  Mail, 
  Lock, 
  User, 
  ArrowRight,
  Globe2,
  BookmarkCheck,
  Flame,
  MessageSquare,
  ShieldAlert,
  X,
  Zap
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// Authentic generated Northwest Tunisia heritage images
import douggaImg from '../src/assets/images/dougga_temple_ruins_1780256199867.png';
import bullaImg from '../src/assets/images/bulla_regia_mosaics_1780256215988.png';
import kefImg from '../src/assets/images/jugurtha_table_kef_1780256235301.png';

interface LandingPageProps {
  onAuthSuccess: (uid: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [activeMood, setActiveMood] = useState('Archaeological');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Firebase domain error tracking
  const [showDomainHelper, setShowDomainHelper] = useState(false);
  const [domainErrorHost, setDomainErrorHost] = useState('');
  const [showOperationNotAllowedHelper, setShowOperationNotAllowedHelper] = useState(false);
  const [disabledProviderName, setDisabledProviderName] = useState('Email/Password');

  // Exclusively Northwest focused travel and explore moods
  const moods = [
    { name: 'Archaeological', label: '🏺 Dougga Capitolin & Roman Forums (Thugga ruins)' },
    { name: 'Subterranean', label: '🏛️ Bulla Regia Subterranean Villas & Mosaics' },
    { name: 'Quarrying', label: '💛 Chemtou Numidian Yellow Marble (Simitthus)' },
    { name: 'Fortress', label: '🌄 Table of Jugurtha Fortress & High Plateau' },
    { name: 'Mountain', label: '🌲 Khroumire Forest Roman Outposts & Folklore' }
  ];

  const handleLaunchVirtualSandbox = () => {
    // Generate a beautiful virtual user session that bypasses Firebase Auth completely!
    const randomId = `local-visitor-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Seed virtual profile detail in localStorage
    const visitorProfile = {
      uid: randomId,
      displayName: "Heritage Guest (" + activeMood + ")",
      email: "guest@memoria.tn",
      bio: "Instant guest visitor discovering Dougga & Bulla Regia over an offline fallback layer.",
      mood: activeMood,
      createdAt: new Date().toISOString()
    };
    
    // Write profile to localStorage so App.tsx can use it
    localStorage.setItem(`memoria_profile_${randomId}`, JSON.stringify(visitorProfile));
    
    onAuthSuccess(randomId);
    setShowOperationNotAllowedHelper(false);
    setShowDomainHelper(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error("Display Name is required.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const profilePath = `userProfiles/${user.uid}`;
        try {
          await setDoc(doc(db, 'userProfiles', user.uid), {
            uid: user.uid,
            displayName: displayName.trim(),
            email: email,
            bio: "Honored to log Northwest ruins, ancient mountain trails, and roman architecture in Memoria.",
            mood: activeMood,
            createdAt: new Date()
          });
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, profilePath);
        }
        
        onAuthSuccess(user.uid);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user.uid);
      }
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/operation-not-allowed' ||
        (err.message && err.message.toLowerCase().includes('operation-not-allowed'))
      ) {
        setDisabledProviderName('Email/Password');
        setShowOperationNotAllowedHelper(true);
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const profilePath = `userProfiles/${user.uid}`;
      try {
        await setDoc(doc(db, 'userProfiles', user.uid), {
          uid: user.uid,
          displayName: user.displayName || 'Northwest Explorer',
          email: user.email || '',
          bio: "Looking forward to mapping the spectacular roman forums & subterranean mosaic trails on Memoria.",
          mood: 'Archaeological',
          createdAt: new Date()
        }, { merge: true });
      } catch (fsErr) {
        console.warn("Silent profile merge notice:", fsErr);
      }

      onAuthSuccess(user.uid);
    } catch (err: any) {
      console.error("Google Auth error:", err);
      // Specifically intercept auth/unauthorized-domain errors
      if (
        err.code === 'auth/unauthorized-domain' || 
        (err.message && err.message.toLowerCase().includes('unauthorized-domain')) ||
        (err.message && err.message.toLowerCase().includes('auth-domain'))
      ) {
        setDomainErrorHost(window.location.hostname);
        setShowDomainHelper(true);
      } else if (
        err.code === 'auth/operation-not-allowed' ||
        (err.message && err.message.toLowerCase().includes('operation-not-allowed'))
      ) {
        setDisabledProviderName('Google Sign-In');
        setShowOperationNotAllowedHelper(true);
      } else {
        setError(err.message || 'Google Auth aborted or unavailable in sandbox environment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError(null);
    setLoading(true);
    setShowDomainHelper(false);
    try {
      // Direct instant fallback to sandbox mode to support systems with disabled email auth or domain errors
      handleLaunchVirtualSandbox();
    } catch (err: any) {
      console.error("Guest bypass error, executing direct virtual sandbox:", err);
      handleLaunchVirtualSandbox();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      
      {/* 1. BRANDING HEADER (NO GRADIENTS) */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-gray-150 sticky top-0 bg-white/80 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-teal-600 rounded-2xl text-white shadow-md">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </span>
          <span 
            id="brand-logo" 
            className="font-serif text-2xl tracking-widest text-teal-700 font-extrabold italic"
          >
            memoria
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 font-mono hidden sm:inline px-3 py-1 bg-teal-50 rounded-full">
            🇹🇳 Northwest Historical Region Hub
          </span>
          <a
            href="#auth-card"
            className="px-4 py-2 text-xs font-semibold rounded-2xl bg-teal-600 hover:bg-teal-700 text-white transition"
          >
            Enter Map
          </a>
        </div>
      </header>

      {/* 2. MAIN BENTO HERO SECTION AND VALUE LAYOUTS */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left column: Value Proposition & Copiously Documented Northwest Assets */}
        <div id="landing-copy-block" className="lg:col-span-7 flex flex-col justify-center space-y-8 pr-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full w-fit">
            <Sparkles size={14} className="text-teal-600" />
            Northwest Tunisia Ancient Majesty
          </div>

          <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tight leading-tight text-slate-900">
            Uncover Legendary Ruins.<br />
            Trace Northwest <span className="text-teal-700">Historical Footprints</span>.
          </h1>

          <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl font-light">
            <strong>Memoria</strong> is dedicated strictly to documenting the fabled Northwest Tunisian archaelogical belt. Map monumental coordinates across <strong>Dougga</strong> temple theatres, log hidden subterranean preservation areas inside <strong>Bulla Regia</strong>, check historic marble mines at <strong>Chemtou</strong>, and scale natural fortresses of <strong>El Kef</strong>. Connect with heritage peers who match your tourism study goals.
          </p>

          {/* Core Northwest Focus Grid Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-150">
                <MapPin size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800">Ancient Forums & Theatres</h3>
                <p className="text-xs text-slate-500 mt-0.5">Plot and bookmark highly conserved Roman Capitols & forums in Thugga and Althiburos.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-150">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800">Archaeology Companion Matching</h3>
                <p className="text-xs text-slate-500 mt-0.5">Meet, share coordinate suggestions, and exchange trails with specialized Northwest history friends.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-150">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800">Traveler Log Critiques</h3>
                <p className="text-xs text-slate-500 mt-0.5">Contribute coordinates and logistics feedback on archaeological museums and excavations.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-50 rounded-xl text-teal-600 border border-teal-150">
                <Globe2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800">Unrestricted Navigation Map</h3>
                <p className="text-xs text-slate-500 mt-0.5">Explore full geospatial layers over Jendouba, Beja, and El Kef heritage boundaries.</p>
              </div>
            </div>
          </div>

          {/* HERITAGE ASSETS SHOWCASE GALLERY (REAL COMPELLED GENERATED PORTRAITS) */}
          <div className="pt-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">Northwest Historical Assets Gallery</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Asset 1: Dougga */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="relative h-40 w-full overflow-hidden">
                  <img 
                    src={douggaImg} 
                    alt="Dougga Ruins" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover hover:scale-105 transition duration-500" 
                  />
                  <div className="absolute top-2 left-2 bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    UNESCO Heritage
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <h4 className="font-serif font-bold text-xs text-slate-800">Dougga (Thugga)</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Béja / Jendouba Border</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">Arguably the most complete Roman antique city preserved in North Africa.</p>
                </div>
              </div>

              {/* Asset 2: Bulla Regia */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="relative h-40 w-full overflow-hidden">
                  <img 
                    src={bullaImg} 
                    alt="Bulla Regia" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover hover:scale-105 transition duration-500" 
                  />
                  <div className="absolute top-2 left-2 bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Subterranean Preservation
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <h4 className="font-serif font-bold text-xs text-slate-800">Bulla Regia</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Jendouba Governorate</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">Famous for its ingenious subterranean villas where residents escaped heat under detailed mosaics.</p>
                </div>
              </div>

              {/* Asset 3: Table of Jugurtha */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="relative h-40 w-full overflow-hidden">
                  <img 
                    src={kefImg} 
                    alt="Jugurtha Table" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover hover:scale-105 transition duration-500" 
                  />
                  <div className="absolute top-2 left-2 bg-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Numidian Fortress
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <h4 className="font-serif font-bold text-xs text-slate-800">Jugurtha's Table</h4>
                  <p className="text-[10px] text-slate-400 font-mono">El Kef Governorate</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">A spectacular high plateau that served King Jugurtha as an impenetrable natural defense.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right column: Auth form Card container */}
        <div id="auth-card" className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl relative">
            <div className="absolute -top-3 -right-3 bg-teal-600 text-white text-[10px] font-extrabold uppercase py-1 px-2.5 rounded-xl shadow-lg flex items-center gap-1 tracking-wider">
              <Flame size={12} /> Northwest Vault
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                {isSignUp ? 'Create your Memoria Profile' : "Access the Northwest"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isSignUp ? 'Configure your mood and register to launch the Tunisia heritage navigation.' : 'Sign in to access interactive maps, save footprints, look up friends and write reviews.'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs rounded-xl mb-4 leading-relaxed font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First & Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Elyes Ben Salem"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-slate-50 text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="email"
                    required
                    placeholder="explorer@memoria.tn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="pt-2 border-t border-slate-150">
                  <label className="block text-xs font-bold text-slate-600 mb-2">My Northwest Tourism Focus Focus</label>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {moods.map((m) => (
                      <button
                        key={m.name}
                        type="button"
                        onClick={() => setActiveMood(m.name)}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition ${
                          activeMood === m.name 
                            ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-teal-600 text-white py-3 px-4 rounded-xl text-xs font-bold tracking-wider hover:bg-teal-700 transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 disabled:cursor-wait font-sans"
              >
                {loading ? 'Securing Link...' : isSignUp ? 'CREATE ACCOUNT & ENTER' : 'SIGN IN TO ENTER'}
                <ArrowRight size={14} />
              </button>
            </form>

            <div className="relative my-6 text-center">
              <hr className="border-slate-150" />
              <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] uppercase font-bold text-slate-400">or</span>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="mr-0.5">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.9h6.69c-.29 1.5-.143 2.78-1.43 3.63v3.02h2.32c1.36-1.25 2.15-3.08 2.15-5.22z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.02-2.32c-.83.56-1.91.89-3.21.89-2.47 0-4.56-1.67-5.31-3.9H5.1v2.37C6.73 21.07 9.12 24 12 24z" />
                <path fill="#FBBC05" d="M6.69 14.53A7.2 7.2 0 0 1 6.2 12c0-.88.16-1.74.45-2.53V7.1H5.1a11.94 11.94 0 0 0 0 9.8l2.35-1.84z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 9.12 0 6.73 2.93 5.1 5.17l2.35 1.84c.75-2.23 2.84-3.9 5.31-3.9z" />
              </svg>
              Sign In with Google
            </button>

            <button
              onClick={handleGuestAccess}
              disabled={loading}
              className="w-full mt-3 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Zap className="text-teal-600 animate-pulse" size={14} />
              Quick Guest Access (No Accounts / Setup Required)
            </button>

            <div className="mt-6 text-center text-xs text-slate-500 font-medium">
              {isSignUp ? 'Already a registered explorer?' : "New to Tunisia's Memoria travel circle?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-teal-600 hover:underline font-bold"
              >
                {isSignUp ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* 3. COHESIVE TRADITIONAL FOOTER (NO GRADIENTS) */}
      <footer className="w-full bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2.5 bg-teal-600 rounded-xl text-white text-xs font-bold leading-none font-serif italic">memoria</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Built with precision to celebrate historical mapping, friendly social coordination, and active AI-assisted heritage guide tools in the breathtaking ancient lands of Northwest Tunisia.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-white tracking-widest mb-3">Historical Assets</h4>
            <ul className="space-y-1.5 text-xs">
              <li>Capitolin Temple of Thugga</li>
              <li>Bulla Regia subterranean villas</li>
              <li>Simitthus yellow marble quarries</li>
              <li>Althiburos ancient forum layouts</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-white tracking-widest mb-3">Tourism Governorates</h4>
            <ul className="space-y-1.5 text-xs">
              <li>Beja ancient wheat values</li>
              <li>Jendouba mountain ruins</li>
              <li>El Kef Numidian history</li>
              <li>Siliana Roman traces</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase text-white tracking-widest mb-3">Security & Sandbox</h4>
            <p className="text-xs text-slate-500 leading-normal font-light">
              Active with 100% free OpenStreetMap layer grids. Zero paid SDK requirements or tracking tags. Explorer logins are fully sandboxed.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-8 pt-6 border-t border-slate-800 text-center text-[10px] text-slate-600 flex justify-between items-center flex-wrap gap-2">
          <p>© 2026 Memoria App. Supporting Northwest Tunisia historical coordinate preservation and spatial tourism values.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-400 transition">Terms</a>
            <a href="#" className="hover:text-slate-400 transition">Security Policy</a>
          </div>
        </div>
      </footer>

      {/* 4. FIREBASE DOMAIN AUTHORIZATION HELPER OVERLAY (NO GRADIENTS) */}
      {showDomainHelper && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 overflow-hidden shadow-2xl border border-slate-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Domain Authorization Required</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Firebase OAuth Guard</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDomainHelper(false)}
                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Instruction Body */}
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed font-light">
                Your Firebase Project configuration does not authorize this dynamic sandbox hostname for Google OAuth. To enable Google Single Sign-In, apply the following steps:
              </p>

              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Active Sandbox Hostname:</p>
                <code className="block bg-slate-200 p-2 text-xs font-semibold font-mono rounded-lg text-slate-800 break-all select-all">
                  {domainErrorHost || "localhost"}
                </code>
              </div>

              <div className="space-y-2 text-xs text-slate-600 font-light">
                <p className="font-semibold text-slate-700">How to authorize this domain:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Open the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-semibold">Firebase Console</a>.</li>
                  <li>Click into your project, then select <strong className="text-slate-800">Authentication</strong> in the sidebar.</li>
                  <li>Navigate to the <strong className="text-slate-800">Settings</strong> (or Auths / Templates) tab.</li>
                  <li>Scroll down or click <strong className="text-slate-800">Authorized domains</strong>.</li>
                  <li>Click <strong className="text-teal-600 font-bold">Add domain</strong> and paste the hostname copy code above.</li>
                  <li>Click save.</li>
                </ol>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-150 rounded-xl">
                <p className="text-[11px] text-teal-800 leading-normal font-medium">
                  💡 <strong>Immediate Alternative:</strong> In the meantime, you can sign up or access the app immediately by using a standard Email and Password standard account without any setup!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={handleLaunchVirtualSandbox}
                className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Zap size={13} className="animate-pulse" />
                Bypass & Launch Offline Sandbox Mode
              </button>
              <button
                onClick={() => setShowDomainHelper(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close & Use Email Logins
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. FIREBASE AUTHENTICATION CONFIGURATION HELPER OVERLAY */}
      {showOperationNotAllowedHelper && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 overflow-hidden shadow-2xl border border-slate-200">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <ShieldAlert size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Auth Provider Disabled</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">Firebase Configuration Guard</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOperationNotAllowedHelper(false)}
                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Instruction Body */}
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed font-light">
                Your Firebase project has restricted or disabled <strong className="text-slate-800">{disabledProviderName}</strong> authentication. To resolve this error and enable official logins, follow these quick steps:
              </p>

              <div className="space-y-2 text-xs text-slate-600 font-light/80 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                <p className="font-bold text-slate-800 uppercase tracking-widest text-[10px] font-mono">Steps to Enable Logins:</p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1">
                  <li>Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-bold font-mono">Firebase Console</a>.</li>
                  <li>Click into your active project, and select <strong className="text-slate-800 font-semibold">Authentication</strong> in the sidebar.</li>
                  <li>Open the <strong className="text-slate-800 font-semibold">Sign-in method</strong> tab.</li>
                  <li>Under <strong className="text-slate-700">Sign-in providers</strong>, edit <strong className="text-teal-600 font-semibold">{disabledProviderName}</strong>.</li>
                  <li>Toggle the <strong className="text-slate-800">Enable</strong> switch, and click <strong className="text-teal-700 font-extrabold">Save</strong>.</li>
                </ol>
              </div>

              <div className="p-3.5 bg-teal-50 border border-teal-150 rounded-xl">
                <p className="text-[11px] text-teal-800 leading-normal font-medium">
                  💡 <strong>Instant Developer Bypass:</strong> Don't have access to the Firebase Console right now? No worries click the button below to instantly launch the **Offline Virtual Sandbox Mode** to test the entire mapping, chat, and review experience over local cache!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={handleLaunchVirtualSandbox}
                className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Zap size={13} className="animate-pulse" />
                Bypass & Launch Offline Sandbox Mode
              </button>
              <button
                onClick={() => setShowOperationNotAllowedHelper(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Close & Try Log In
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
