import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Heart, 
  UserPlus, 
  UserCheck, 
  UserX,
  BadgeAlert,
  Loader2,
  HeartHandshake
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query, 
  where 
} from 'firebase/firestore';
import { UserProfile, Friendship } from '../types';

interface ProfileModalProps {
  currentUid: string;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ currentUid, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [moodInput, setMoodInput] = useState('Archaeological');
  
  // Community List
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'me' | 'discover' | 'friends'>('me');

  const tourismMoods = [
    { name: 'Archaeological', label: '🏺 Ancient Heritage (Carthage, Dougga)' },
    { name: 'Beach', label: '🏖️ Sun & Mediterranean Coast (Djerba, Sousse)' },
    { name: 'Nature', label: '🏜️ Sahara Dunes & Olive Grooves (Tozeur)' },
    { name: 'Culinary', label: '🌶️ Spicy Harissa & Couscous Gastronomy' },
    { name: 'Culture', label: '🕌 Medina & Blue Sidi Bou Said Art' }
  ];

  // Load Current Profile
  const loadMyProfile = async () => {
    try {
      const docRef = doc(db, 'userProfiles', currentUid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setNameInput(data.displayName);
        setBioInput(data.bio || '');
        setMoodInput(data.mood || 'Archaeological');
      }
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.GET, `userProfiles/${currentUid}`);
    }
  };

  // Load Community and Relationships
  const loadCommunityData = async () => {
    try {
      // 1. Fetch other profiles
      const usersSnap = await getDocs(collection(db, 'userProfiles'));
      const listOfUsers: UserProfile[] = [];
      usersSnap.forEach((doc) => {
        const u = doc.data() as UserProfile;
        if (u.uid !== currentUid) {
          listOfUsers.push(u);
        }
      });
      setAllUsers(listOfUsers);

      // 2. Fetch friendships involving current user
      const fList: Friendship[] = [];

      const qSender = query(collection(db, 'friendships'), where('senderUid', '==', currentUid));
      const qReceiver = query(collection(db, 'friendships'), where('receiverUid', '==', currentUid));

      const senderSnap = await getDocs(qSender);
      senderSnap.forEach((d) => {
        fList.push(d.data() as Friendship);
      });

      const receiverSnap = await getDocs(qReceiver);
      receiverSnap.forEach((d) => {
        // Prevent duplicate push
        if (!fList.some(f => f.id === d.id)) {
          fList.push(d.data() as Friendship);
        }
      });

      setFriendships(fList);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.LIST, 'friendships/userProfiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const startLoad = async () => {
      setLoading(true);
      await loadMyProfile();
      await loadCommunityData();
    };
    startLoad();
  }, [currentUid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaveLoading(true);

    try {
      const profileRef = doc(db, 'userProfiles', currentUid);
      await updateDoc(profileRef, {
        displayName: nameInput.trim(),
        bio: bioInput.trim(),
        mood: moodInput
      });

      setProfile(prev => prev ? {
        ...prev,
        displayName: nameInput.trim(),
        bio: bioInput.trim(),
        mood: moodInput
      } : null);

      setEditing(false);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `userProfiles/${currentUid}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Send Invitation
  const sendFriendInvite = async (targetUser: UserProfile) => {
    if (!profile) return;
    const compositeId = `${currentUid}_${targetUser.uid}`;
    
    try {
      const friendshipDoc: Friendship = {
        id: compositeId,
        senderUid: currentUid,
        receiverUid: targetUser.uid,
        senderName: profile.displayName,
        receiverName: targetUser.displayName,
        status: 'pending',
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'friendships', compositeId), friendshipDoc);
      
      // Update local state smoothly
      setFriendships(prev => [...prev, friendshipDoc]);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, `friendships/${compositeId}`);
    }
  };

  // Accept Invite
  const acceptFriendInvite = async (friendship: Friendship) => {
    try {
      const docRef = doc(db, 'friendships', friendship.id);
      await updateDoc(docRef, {
        status: 'accepted',
        updatedAt: new Date()
      });

      setFriendships(prev => prev.map(f => {
        if (f.id === friendship.id) {
          return { ...f, status: 'accepted' };
        }
        return f;
      }));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `friendships/${friendship.id}`);
    }
  };

  // Decline or Cancel Relationship
  const removeFriendship = async (friendshipId: string) => {
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      setFriendships(prev => prev.filter(f => f.id !== friendshipId));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `friendships/${friendshipId}`);
    }
  };

  // Helper matching state
  const getRelationStatus = (targetUid: string) => {
    const relation = friendships.find(f => 
      (f.senderUid === currentUid && f.receiverUid === targetUid) ||
      (f.senderUid === targetUid && f.receiverUid === currentUid)
    );
    return relation;
  };

  const getMoodLabel = (mKey: string) => {
    const moodObj = tourismMoods.find(t => t.name === mKey);
    return moodObj ? moodObj.label : mKey;
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[580px] border border-slate-200">
        
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-600 rounded-xl text-white">
              <HeartHandshake size={18} />
            </span>
            <h2 className="font-serif text-lg font-bold text-slate-800 tracking-wider">
              Memoria Explorer Hub
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('me')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'me' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👤 My ProfileCard
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'discover' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🏺 Mood Matchers ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'friends' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🤝 Friends Circle ({friendships.filter(f => f.status === 'accepted').length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <p className="text-xs font-mono">Syncing database assets...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: MY PROFILE CARD */}
              {activeTab === 'me' && profile && (
                <div className="space-y-6">
                  {!editing ? (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-150">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900">{profile.displayName}</h3>
                            <p className="text-xs text-slate-400 font-mono italic">{profile.email}</p>
                          </div>
                          <span className="text-xs px-2.5 py-1 bg-teal-100 text-teal-800 font-bold rounded-lg font-mono">
                            {getMoodLabel(profile.mood)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-4 leading-relaxed font-light">
                          {profile.bio || "No biography details configured. Tap Edit below to add information."}
                        </p>
                      </div>

                      <button
                        onClick={() => setEditing(true)}
                        className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
                      >
                        ✏️ Edit Profile Card
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 border border-slate-150 p-5 rounded-2xl">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Display Name</label>
                        <input
                          type="text"
                          required
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Biography</label>
                        <textarea
                          value={bioInput}
                          rows={3}
                          placeholder="Tell people what parts of Tunisia you are interested in visiting..."
                          onChange={(e) => setBioInput(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Wandering Tourism Mood</label>
                        <div className="grid grid-cols-1 gap-2">
                          {tourismMoods.map((m) => (
                            <button
                              key={m.name}
                              type="button"
                              onClick={() => setMoodInput(m.name)}
                              className={`text-left text-xs px-3 py-2 rounded-lg border transition ${
                                moodInput === m.name
                                  ? 'bg-teal-50 border-teal-300 text-teal-800 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          disabled={saveLoading}
                          className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition flex items-center gap-1.5"
                        >
                          {saveLoading ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="px-4 py-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: DISCOVER MOOD MATCHERS */}
              {activeTab === 'discover' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 font-medium">Browse registered travelers on Memoria. Match your current Tourism moods to explore Tunisia together!</p>
                  
                  {allUsers.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No other explorers found in the area yet. Share the app to grow the circle!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 space-y-4">
                      {allUsers.map((u) => {
                        const rel = getRelationStatus(u.uid);
                        const isMoodMatch = profile && profile.mood === u.mood;

                        return (
                          <div key={u.uid} className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-800">{u.displayName}</h4>
                                {isMoodMatch && (
                                  <span className="px-2 py-0.5 bg-rose-100 border border-rose-300 text-rose-700 font-semibold rounded-full text-[9px] flex items-center gap-0.5">
                                    <Heart size={10} className="fill-rose-700" /> Mood Match!
                                  </span>
                                )}
                              </div>
                              <span className="inline-block text-[10px] text-slate-500 font-mono bg-slate-100 py-0.5 px-1.5 rounded">
                                {getMoodLabel(u.mood)}
                              </span>
                              <p className="text-xs text-slate-500 mt-1 italic font-light leading-relaxed">{u.bio || "No story added."}</p>
                            </div>

                            <div className="shrink-0">
                              {/* Relationship buttons */}
                              {!rel ? (
                                <button
                                  onClick={() => sendFriendInvite(u)}
                                  className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold rounded-xl hover:bg-teal-100/60 transition flex items-center gap-1"
                                >
                                  <UserPlus size={13} /> Invite Friend
                                </button>
                              ) : rel.status === 'pending' ? (
                                rel.senderUid === currentUid ? (
                                  <button
                                    onClick={() => removeFriendship(rel.id)}
                                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:bg-slate-200/50 transition"
                                  >
                                    Cancel Invite
                                  </button>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => acceptFriendInvite(rel)}
                                      className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition flex items-center gap-1"
                                    >
                                      <UserCheck size={12} /> Accept
                                    </button>
                                    <button
                                      onClick={() => removeFriendship(rel.id)}
                                      className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-100/50 transition flex items-center gap-0.5"
                                    >
                                      <UserX size={12} /> Decline
                                    </button>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
                                  <UserCheck size={14} className="text-teal-600" /> Companion
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FRIENDS CIRCLE LIST */}
              {activeTab === 'friends' && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-400 font-medium">Your absolute companions on the Tunisia Heritage trails.</p>
                  
                  {friendships.filter(f => f.status === 'accepted').length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No companions verified on your circle yet. Check pending invitations or send a mood invite in the Discover tab!
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {friendships.filter(f => f.status === 'accepted').map((f) => {
                        const isSenderMe = f.senderUid === currentUid;
                        const companionName = isSenderMe ? f.receiverName : f.senderName;
                        const companionUid = isSenderMe ? f.receiverUid : f.senderUid;
                        
                        // Try matching with user list to show active companion details
                        const targetUserObj = allUsers.find(au => au.uid === companionUid);

                        return (
                          <div key={f.id} className="py-3.5 flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-slate-800">{companionName}</h4>
                              {targetUserObj && (
                                <span className="text-[10px] text-teal-600 font-mono font-medium">
                                  Active Mood: {getMoodLabel(targetUserObj.mood)}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => removeFriendship(f.id)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                            >
                              <UserX size={14} /> Remove Friend
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
