# Security Specification: Memoria (Tunisia Tourism App)

## 1. Data Invariants
1. **User Profile**: A user profile MUST match their authenticated `uid` exactly. Users cannot register profiles for other people.
2. **Saved Places**: Only the owner of the user profile can read, create, or update places in their subcollection.
3. **Reviews**: Global scope. Any authenticated visitor can read all reviews. Creating/updating is locked to the owner (`request.auth.uid == incoming().userId`). Reviews must have a rating between 1 and 5.
4. **Conversations**: Only the owner can view or write chat history to prevent leak of AI guidance or search entries.
5. **Friendship / Invites**: Users can only send invites where they are the `senderUid`. Users can only accept requests if they are the `receiverUid`.

---

## 2. The "Dirty Dozen" Spoof/Attack Payloads
Here are 12 specific JSON payloads designed to violate system constraints:

1. **Spoofed UserProfile Profile Creation**: Attempting to create a userProfile for a different user ID (`userProfiles/attackerUid` containing `uid: "victimUid"`).
2. **Profile Admin Field Injection**: Attempting to create or update a userProfile with a spoofed custom field `role: "admin"` or `isAdmin: true` to bypass protections.
3. **Immutability Breach on Profile**: Trying to modify `createdAt` or `email` fields after profile instantiation.
4. **Foreign Saved Place Query Access**: Attempting to fetch or list savedPlaces under another traveler's profile parent node (`userProfiles/victimUid/savedPlaces/{id}`).
5. **Saved Place Identity Fraud**: Creating a savedPlace with `userId: "victimUid"` inside the attacker's own subcollection.
6. **Malicious Review Rating Hijack**: Creating or updating a review with `rating: 10` or `rating: -1` (boundary exceedance).
7. **Malicious Review Identity Hijack**: Writing a review but declaring the author `userId` as `victimUid` to defame other members.
8. **Malicious Review Modification**: Attempting to update or edit another user's review in the global collection.
9. **Conversation Eavesdropping**: Attempting to fetch/list a conversation that belongs to `victimUid`.
10. **Conversation Ownership Fraud**: Writing a chatbot session under the attacker's account, but setting `userId: "victimUid"`.
11. **Illegal Force Friend Acceptance**: Attempting to create or transition a friendship into `status: "accepted"` from the sender's end without a genuine receiver response.
12. **Foreign Friendship Snoop**: Standard read/list query to view a friendship list of which the current user is neither the sender nor receiver.

---

## 3. Test Runner Definition: `firestore.rules.test.ts`
*(Conceptual test runner executing security specifications to verify total PERMISSION_DENIED enforcement)*
```typescript
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

// Verification suite mock structure ensuring the rules system returns PERMISSION_DENIED on each of the "Dirty Dozen" payloads above.
```
