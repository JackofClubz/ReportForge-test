import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Using token-based authentication via Supabase Edge Functions
// No public API key needed as all authentication is handled server-side

// Create the Liveblocks client with token-based authentication
const client = createClient({
  authEndpoint: async () => {
    // Import the token service
    const { getCachedLiveblocksToken } = await import('./services/liveblocksTokenService');
    
    try {
      const token = await getCachedLiveblocksToken();
      return { token };
    } catch (error) {
      /*console.error('🔐 [LIVEBLOCKS-CONFIG] Failed to get token:', error);*/
      // Return error as expected by Liveblocks
      throw new Error('Authentication failed');
    }
  },
  
  resolveUsers: async ({ userIds }) => {
    console.log('👤 [RESOLVE] Resolving users for IDs:', userIds);
    try {
      const { resolveUsersByIds } = await import('./services/userService');
      const users = await resolveUsersByIds(userIds);
      
      // Return in exact UserMeta["info"] format as required by Liveblocks
      const resolvedUsers = users.map(user => ({
        name: user.name,
        avatar: user.avatar,
        color: user.color,
        email: user.email,
        role: user.role,
      }));
      
      console.log('✅ [RESOLVE] Resolved users:', resolvedUsers.map(u => `${u.name} (${u.email})`));
      return resolvedUsers;
    } catch (error) {
      console.error('❌ [RESOLVE] Error resolving users:', error);
      // Return basic user info based on IDs to prevent showing as Anonymous
      return userIds.map(id => ({
        name: `User ${id.slice(0, 8)}...`,
        avatar: "",
        color: "#4ECDC4",
        email: "",
        role: "viewer",
      }));
    }
  },
  
  resolveMentionSuggestions: async ({ text, roomId }) => {
    console.log('🔍 [MENTIONS] Resolving mention suggestions:', { text, roomId });
    try {
      const { searchUsersForMentions } = await import('./services/userService');
      // Extract reportId from roomId (format: "report-{reportId}")
      const reportIdFromRoom = roomId.replace('report-', '');
      console.log('📝 [MENTIONS] Searching for reportId:', reportIdFromRoom, 'with text:', text);
      const userIds = await searchUsersForMentions(reportIdFromRoom, text || '');
      console.log('✅ [MENTIONS] Found user suggestions:', userIds);
      return userIds;
    } catch (error) {
      console.error('❌ [LIVEBLOCKS] Error searching mention suggestions:', error);
      return [];
    }
  },
});

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  cursor: { x: number; y: number } | null;
  selection: { blockId: string; start: number; end: number } | null;
  user: {
    id: string;
    name: string;
    avatar: string;
    color: string;
  };
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all users leave. Fields under Storage typically are
// LiveObjects, LiveMaps, LiveLists, etc.
type Storage = {
  // Example: document: LiveObject<{ title: string; content: string }>
};

// Global Liveblocks interface declaration as required by Liveblocks
declare global {
  interface Liveblocks {
    // UserMeta represents static/readonly metadata on each user, as
    // provided by your own custom auth back end (if used). Useful for data that
    // will not change during the session, like a user's name or avatar.
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
        // Additional metadata
        email?: string;
        role?: string;
      };
    };
  }
}

type UserMeta = Liveblocks["UserMeta"];

// Optionally, the type of custom events broadcast and listened to in this
// room. Use a union for multiple events. Must be JSON-serializable.
type RoomEvent = {
  type: "REPORT_SAVED";
  data: { savedAt: string };
} | {
  type: "USER_TYPING";
  data: { userId: string; isTyping: boolean };
};

// Optionally, when using Comments, ThreadMetadata represents metadata on
// each thread. Can only contain booleans, strings, and numbers.
export type ThreadMetadata = {
  resolved: boolean;
  quote: string;
  time: number;
};

// Create the Room Context
export const {
  suspense: {
    RoomProvider,
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useBatch,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
    useThreads,
    useCreateThread,
    useEditThreadMetadata,
    useCreateComment,
    useEditComment,
    useDeleteComment,
    useAddReaction,
    useRemoveReaction,
    useThreadSubscription,
    useMarkThreadAsRead,
    useRoomNotificationSettings,
    useUpdateRoomNotificationSettings,
    // These hooks can be exported from any one of the files
    // they don't have to be re-exported from here
    useUser,
    useRoomInfo,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(client);

// Export the client for use in other parts of the app
export { client };
export default client; 