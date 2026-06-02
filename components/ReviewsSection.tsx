import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  Trash2, 
  ShieldAlert,
  Loader2,
  MapPin,
  Send
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { Review } from '../types';

interface ReviewsSectionProps {
  currentUid: string;
  userDisplayName: string;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ currentUid, userDisplayName }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Write Review Inputs
  const [placeTitle, setPlaceTitle] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      if (currentUid.startsWith('visitor-') || currentUid.startsWith('local-')) {
        const storedReviews = localStorage.getItem('memoria_local_reviews');
        if (storedReviews) {
          setReviews(JSON.parse(storedReviews));
        } else {
          const seedReviews: Review[] = [
            {
              id: 'seed-1',
              userId: 'seed-author-1',
              userDisplayName: 'Ahmed Ben Salem',
              placeTitle: 'Dougga (Thugga) Capitolin',
              rating: 5,
              text: 'Breathtaking Roman city! The golden limestone arches are beautifully preserved. Morning hours are best for photography.',
              createdAt: new Date(Date.now() - 3600000 * 24)
            },
            {
              id: 'seed-2',
              userId: 'seed-author-2',
              userDisplayName: 'Meriam Jaleleddine',
              placeTitle: 'Bulla Regia Subterranean Villas',
              rating: 5,
              text: 'Remarkable underground rooms. Looking down at the preserved mosaics underground was a magical experience. Well worth the drive!',
              createdAt: new Date(Date.now() - 3600000 * 48)
            }
          ];
          localStorage.setItem('memoria_local_reviews', JSON.stringify(seedReviews));
          setReviews(seedReviews);
        }
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      const tempReviews: Review[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        tempReviews.push({
          id: docSnap.id,
          userId: data.userId,
          userDisplayName: data.userDisplayName,
          placeTitle: data.placeTitle,
          rating: Number(data.rating),
          text: data.text,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        });
      });
      setReviews(tempReviews);
    } catch (err) {
      console.warn("Firestore reviews fallback to local storage:", err);
      // Fallback on permission/network error as well
      const storedReviews = localStorage.getItem('memoria_local_reviews');
      if (storedReviews) {
        setReviews(JSON.parse(storedReviews));
      } else {
        const seedReviews: Review[] = [
          {
            id: 'seed-1',
            userId: 'seed-author-1',
            userDisplayName: 'Ahmed Ben Salem',
            placeTitle: 'Dougga (Thugga) Capitolin',
            rating: 5,
            text: 'Breathtaking Roman city! The golden limestone arches are beautifully preserved. Morning hours are best for photography.',
            createdAt: new Date(Date.now() - 3600000 * 24)
          }
        ];
        localStorage.setItem('memoria_local_reviews', JSON.stringify(seedReviews));
        setReviews(seedReviews);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeTitle.trim() || !text.trim()) return;
    setSubmitLoading(true);
    setErrorMsg(null);

    const reviewId = `rev_${Date.now()}`;
    const newReview = {
      id: reviewId,
      userId: currentUid,
      userDisplayName: userDisplayName || 'Tunisian Traveler',
      placeTitle: placeTitle.trim(),
      rating: Number(rating),
      text: text.trim(),
      createdAt: new Date().toISOString() as any
    };

    if (currentUid.startsWith('visitor-') || currentUid.startsWith('local-')) {
      const storedReviews = localStorage.getItem('memoria_local_reviews');
      const currentList: Review[] = storedReviews ? JSON.parse(storedReviews) : [];
      const updated = [
        {
          ...newReview,
          createdAt: new Date()
        },
        ...currentList
      ];
      localStorage.setItem('memoria_local_reviews', JSON.stringify(updated));
      setReviews(updated);
      setPlaceTitle('');
      setText('');
      setRating(5);
      setSubmitLoading(false);
      return;
    }

    try {
      const reviewPath = `reviews/${reviewId}`;
      const firestoreReview = {
        ...newReview,
        createdAt: serverTimestamp()
      };
      // Use setDoc with strict ID key matched to rules ID parameter
      await setDoc(doc(db, 'reviews', reviewId), firestoreReview);

      setPlaceTitle('');
      setText('');
      setRating(5);
      
      // Reload lists
      await loadReviews();
    } catch (err: any) {
      console.warn("Firestore reviews write failed, inserting into local backup:", err);
      // Write locally as a graceful fallback
      const storedReviews = localStorage.getItem('memoria_local_reviews');
      const currentList: Review[] = storedReviews ? JSON.parse(storedReviews) : [];
      const updated = [
        {
          ...newReview,
          createdAt: new Date()
        },
        ...currentList
      ];
      localStorage.setItem('memoria_local_reviews', JSON.stringify(updated));
      setReviews(updated);
      setPlaceTitle('');
      setText('');
      setRating(5);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (currentUid.startsWith('visitor-') || currentUid.startsWith('local-')) {
      const storedReviews = localStorage.getItem('memoria_local_reviews');
      if (storedReviews) {
        const currentList: Review[] = JSON.parse(storedReviews);
        const updated = currentList.filter(r => r.id !== reviewId);
        localStorage.setItem('memoria_local_reviews', JSON.stringify(updated));
        setReviews(updated);
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      console.warn("Firestore reviews delete fallback to local storage:", err);
      const storedReviews = localStorage.getItem('memoria_local_reviews');
      if (storedReviews) {
        const currentList: Review[] = JSON.parse(storedReviews);
        const updated = currentList.filter(r => r.id !== reviewId);
        localStorage.setItem('memoria_local_reviews', JSON.stringify(updated));
        setReviews(updated);
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="p-2 bg-teal-600 rounded-xl text-white">
          <MessageSquare size={16} />
        </span>
        <div>
          <h3 className="font-serif text-sm font-bold text-slate-800 tracking-wider">Northwest Community Reviews</h3>
          <p className="text-[10px] text-slate-400">Read and write experiences across our Northwest archaeology hotspots</p>
        </div>
      </div>

      {/* Write a review */}
      <form onSubmit={handleCreateReview} className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-150/85 space-y-3 shrink-0">
        <h4 className="text-xs font-bold text-slate-700">Write Your Feedback</h4>
        
        {errorMsg && (
          <p className="text-[10px] text-red-600 font-semibold bg-red-50 p-2 rounded-lg">{errorMsg}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Northwest Landmark / Spot</label>
            <input 
              type="text"
              required
              placeholder="e.g Dougga Ruins, Bulla Regia Mosaics"
              value={placeTitle}
              onChange={(e) => setPlaceTitle(e.target.value)}
              className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Review Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              <option value="5">⭐⭐⭐⭐⭐ Outstanding (5/5)</option>
              <option value="4">⭐⭐⭐⭐ Great Experience (4/5)</option>
              <option value="3">⭐⭐⭐ Neutral (3/5)</option>
              <option value="2">⭐⭐ Fair (2/5)</option>
              <option value="1">⭐ Poor Sightseeing (1/5)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Your Commentary</label>
          <textarea 
            required
            placeholder="Tell future travelers about local values, history, or logistics..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={submitLoading}
          className="w-full bg-teal-600 text-white rounded-xl py-2 px-3 text-xs font-bold hover:bg-teal-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {submitLoading ? 'Registering...' : 'Publish Critique'}
          <Send size={12} />
        </button>
      </form>

      {/* Global Review Streams */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[340px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-[10px] font-mono">Syncing global feeds...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-light">
            No critiques published yet. Be the first to record!
          </div>
        ) : (
          <div className="space-y-3.5">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 bg-white border border-slate-150 rounded-2xl shadow-xs transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                      <MapPin size={12} className="text-rose-500" />
                      {r.placeTitle}
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">By {r.userDisplayName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5 text-xs text-amber-500 font-bold bg-amber-50 py-0.5 px-1.5 rounded-lg">
                      <Star size={12} className="fill-amber-500" /> {r.rating}/5
                    </span>
                    
                    {r.userId === currentUid && (
                      <button
                        onClick={() => handleDeleteReview(r.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-slate-600 text-xs mt-2.5 leading-relaxed font-light whitespace-pre-line">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
