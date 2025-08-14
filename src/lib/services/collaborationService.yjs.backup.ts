import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { supabase } from '../supabaseClient';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: {
    anchor: number;
    head: number;
  };
}

export interface CollaborationInstance {
  doc: Y.Doc;
  websocketProvider: WebsocketProvider | null;
  webrtcProvider: WebrtcProvider | null;
  indexeddbProvider: IndexeddbPersistence;
  config: any;
  reportId: string;
  userId: string;
  user: CollaborationUser;
  refCount: number;
  created: Date;
  isOnline: boolean;
  reactComponentCount: number; // Track React component mounts
}

export interface CollaborationConfig {
  enableWebSocket?: boolean;
  enableWebRTC?: boolean;
  websocketUrl: string;
  signalServers?: string[];
}

// Global state outside React - persists across strict mode re-mounts
class GlobalCollaborationState {
  private static instance: GlobalCollaborationState;
  private instances: Map<string, CollaborationInstance> = new Map();
  private initializationPromises: Map<string, Promise<CollaborationInstance>> = new Map();

  static getInstance(): GlobalCollaborationState {
    if (!GlobalCollaborationState.instance) {
      GlobalCollaborationState.instance = new GlobalCollaborationState();
    }
    return GlobalCollaborationState.instance;
  }

  getInstances(): Map<string, CollaborationInstance> {
    return this.instances;
  }

  getInitializationPromises(): Map<string, Promise<CollaborationInstance>> {
    return this.initializationPromises;
  }

  setInstance(reportId: string, instance: CollaborationInstance): void {
    this.instances.set(reportId, instance);
  }

  deleteInstance(reportId: string): void {
    this.instances.delete(reportId);
  }

  setInitializationPromise(reportId: string, promise: Promise<CollaborationInstance>): void {
    this.initializationPromises.set(reportId, promise);
  }

  deleteInitializationPromise(reportId: string): void {
    this.initializationPromises.delete(reportId);
  }
}

class CollaborationManager {
  private config: CollaborationConfig;
  private globalState: GlobalCollaborationState;

  constructor() {
    this.globalState = GlobalCollaborationState.getInstance();
    
    // Default configuration - can be overridden via environment variables
    this.config = {
      enableWebSocket: true,
      enableWebRTC: true,
      websocketUrl: this.getWebSocketUrl(),
      signalServers: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
        'wss://y-webrtc-signaling-us.herokuapp.com'
      ]
    };
  }

  private getWebSocketUrl(): string {
    // Try to get from environment or use default
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // For development, try localhost first
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:1234`;
      }
      
      // For production, use your WebSocket server URL
      return `${protocol}//${hostname}/ws`;
    }
    
    return 'ws://localhost:1234';
  }

  async getOrCreateInstance(reportId: string): Promise<CollaborationInstance> {
    const instances = this.globalState.getInstances();
    const initPromises = this.globalState.getInitializationPromises();
    
    // Check if instance already exists globally
    const existing = instances.get(reportId);
    if (existing) {
      console.log(`♻️ [COLLAB-SERVICE] Reusing global instance for [${reportId}]. ReactComponents: ${existing.reactComponentCount} -> ${existing.reactComponentCount + 1}`);
      existing.reactComponentCount++;
      existing.refCount++;
      return existing;
    }

    // Check if initialization is already in progress
    const existingPromise = initPromises.get(reportId);
    if (existingPromise) {
      console.log(`⏳ [COLLAB-SERVICE] Waiting for existing initialization for [${reportId}]`);
      const instance = await existingPromise;
      instance.reactComponentCount++;
      instance.refCount++;
      return instance;
    }

    console.log(`🔧 [COLLAB-SERVICE] Creating NEW global instance for [${reportId}]`);
    
    // Create initialization promise to prevent race conditions
    const initPromise = this.createInstance(reportId);
    this.globalState.setInitializationPromise(reportId, initPromise);
    
    try {
      const instance = await initPromise;
      this.globalState.deleteInitializationPromise(reportId);
      return instance;
    } catch (error) {
      this.globalState.deleteInitializationPromise(reportId);
      throw error;
    }
  }

  private async createInstance(reportId: string): Promise<CollaborationInstance> {
    const doc = new Y.Doc();
    const roomName = `reportforge-${reportId}`;
    
    // Get current user info
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('User must be authenticated to collaborate');
    }

    // Create IndexedDB persistence
    const indexeddbProvider = new IndexeddbPersistence(roomName, doc);
    
    let websocketProvider: WebsocketProvider | null = null;
    let webrtcProvider: WebrtcProvider | null = null;

    // Create WebSocket provider for cross-device collaboration
    if (this.config.enableWebSocket && this.config.websocketUrl) {
      try {
        const token = await this.getAuthToken();
        websocketProvider = new WebsocketProvider(
          this.config.websocketUrl,
          roomName,
          doc,
          token ? {
            params: {
              // Add authentication token for secure rooms
              token: token
            }
          } : undefined
        );

        websocketProvider.on('status', (event: { status: string }) => {
          console.log(`🌐 [WEBSOCKET] Status [${reportId}]: ${event.status}`);
        });

        websocketProvider.on('connection-close', (event: any) => {
          console.log(`🌐 [WEBSOCKET] Connection closed [${reportId}]:`, event);
        });

        websocketProvider.on('connection-error', (event: any) => {
          console.error(`🌐 [WEBSOCKET] Connection error [${reportId}]:`, event);
        });

        console.log(`✅ [COLLAB-SERVICE] WebSocket provider created for [${reportId}]`);
      } catch (error) {
        console.warn(`⚠️ [COLLAB-SERVICE] Failed to create WebSocket provider:`, error);
      }
    }

    // Create WebRTC provider for peer-to-peer collaboration (fallback/performance)
    if (this.config.enableWebRTC) {
      try {
        // Check if a WebRTC room already exists globally (React Strict Mode protection)
        const existingRoomKey = `webrtc-${roomName}`;
        if ((globalThis as any)[existingRoomKey]) {
          console.log(`⚠️ [COLLAB-SERVICE] WebRTC room already exists globally for [${reportId}], skipping WebRTC (React Strict Mode)`);
        } else {
          // Mark this room as existing globally
          (globalThis as any)[existingRoomKey] = true;
          
          webrtcProvider = new WebrtcProvider(roomName, doc, {
            signaling: this.config.signalServers || [],
            password: `reportforge-${reportId}`, // Room password for security
          });

          webrtcProvider.on('status', (event: { connected: boolean }) => {
            console.log(`📡 [WEBRTC] Status [${reportId}]: ${event.connected ? 'connected' : 'disconnected'}`);
          });

          webrtcProvider.on('peers', (event: { added: any[], removed: any[], webrtcPeers: any[], bcPeers: any[] }) => {
            console.log(`🔗 [WEBRTC] Peers [${reportId}] - WebRTC: ${event.webrtcPeers.length}, BC: ${event.bcPeers.length}`);
          });

          console.log(`✅ [COLLAB-SERVICE] WebRTC provider created for [${reportId}]`);
        }
      } catch (error: any) {
        console.warn(`⚠️ [COLLAB-SERVICE] Failed to create WebRTC provider for [${reportId}]:`, error);
        webrtcProvider = null;
      }
    }

    // Set up awareness with user information
    const primaryProvider = websocketProvider || webrtcProvider;
    if (primaryProvider?.awareness) {
      primaryProvider.awareness.setLocalStateField('user', {
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
        avatar: user.avatar
      });

      // Listen for awareness changes
      primaryProvider.awareness.on('change', () => {
        const states = primaryProvider.awareness.getStates();
        console.log(`👥 [COLLAB-SERVICE] Awareness [${reportId}] - active users: ${states.size}`);
        
        // Emit custom event for UI updates
        this.emitPresenceUpdate(reportId, Array.from(states.values()));
      });
    }

    // IndexedDB sync event
    indexeddbProvider.on('synced', () => {
      console.log(`💾 [COLLAB-SERVICE] IndexedDB synced [${reportId}]`);
    });

    const collaborationConfig = {
      provider: primaryProvider,
      fragment: doc.getXmlFragment("document-store"),
      user: {
        id: user.id,
        name: user.name,
        color: user.color,
      },
    };

    const instance: CollaborationInstance = {
      doc,
      websocketProvider,
      webrtcProvider,
      indexeddbProvider,
      config: collaborationConfig,
      reportId,
      userId: user.id,
      user,
      refCount: 1,
      created: new Date(),
      isOnline: websocketProvider?.wsconnected || webrtcProvider?.connected || false,
      reactComponentCount: 1, // Track React component usage
    };

    this.globalState.setInstance(reportId, instance);
    this.setupInstanceMonitoring(instance);

    console.log(`💾 [COLLAB-SERVICE] Stored global instance for [${reportId}]`);
    return instance;
  }

  private async getCurrentUser(): Promise<CollaborationUser | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return null;

      // Try to get additional user profile info, but handle gracefully if profiles table doesn't exist
      let profile = null;
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', authUser.id)
          .single();
        profile = profileData;
      } catch (profileError) {
        // Profiles table might not exist or user might not have a profile - that's ok
        console.log('[COLLAB-SERVICE] No profile found, using auth data only');
      }

      const displayName = profile?.display_name || 
                         authUser.user_metadata?.full_name || 
                         authUser.email?.split('@')[0] || 
                         'Anonymous User';

      return {
        id: authUser.id,
        name: displayName,
        email: authUser.email || '',
        avatar: profile?.avatar_url,
        color: this.generateUserColor(authUser.id)
      };
    } catch (error) {
      console.error('[COLLAB-SERVICE] Error getting current user:', error);
      return null;
    }
  }

  private async getAuthToken(): Promise<string | undefined> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch (error) {
      console.error('[COLLAB-SERVICE] Error getting auth token:', error);
      return undefined;
    }
  }

  private generateUserColor(userId: string): string {
    // Generate a consistent color based on user ID
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
      '#686DE0', '#4834D4', '#130F40', '#30336B', '#6C5CE7'
    ];
    
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  }

  private setupInstanceMonitoring(instance: CollaborationInstance): void {
    // Monitor connection status
    const checkConnection = () => {
      const wasOnline = instance.isOnline;
      instance.isOnline = instance.websocketProvider?.wsconnected || 
                         instance.webrtcProvider?.connected || 
                         false;
      
      if (wasOnline !== instance.isOnline) {
        console.log(`📶 [COLLAB-SERVICE] Connection status changed [${instance.reportId}]: ${instance.isOnline ? 'online' : 'offline'}`);
        this.emitConnectionUpdate(instance.reportId, instance.isOnline);
      }
    };

    // Check connection every 5 seconds
    const interval = setInterval(checkConnection, 5000);
    
    // Store interval for cleanup
    (instance as any).monitoringInterval = interval;
  }

  private emitPresenceUpdate(reportId: string, users: any[]): void {
    const event = new CustomEvent('collaboration:presence', {
      detail: { reportId, users }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  private emitConnectionUpdate(reportId: string, isOnline: boolean): void {
    const event = new CustomEvent('collaboration:connection', {
      detail: { reportId, isOnline }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  releaseInstance(reportId: string): void {
    const instances = this.globalState.getInstances();
    const instance = instances.get(reportId);
    
    if (!instance) {
      console.log(`❌ [COLLAB-SERVICE] No global instance found to release for [${reportId}]`);
      return;
    }
    
    instance.refCount--;
    instance.reactComponentCount--;
    console.log(`🔄 [COLLAB-SERVICE] Released instance for [${reportId}]. RefCount: ${instance.refCount + 1} -> ${instance.refCount}, ReactComponents: ${instance.reactComponentCount + 1} -> ${instance.reactComponentCount}`);
    
    // Only destroy if no React components are using it AND refCount is 0
    if (instance.refCount <= 0 && instance.reactComponentCount <= 0) {
      console.log(`🧹 [COLLAB-SERVICE] Destroying global instance for [${reportId}] (no more React components or refs)`);
      this.destroyInstance(instance);
    } else if (instance.reactComponentCount <= 0) {
      console.log(`⏳ [COLLAB-SERVICE] Instance [${reportId}] still has ${instance.refCount} refs, keeping alive`);
    }
  }

  private destroyInstance(instance: CollaborationInstance): void {
    try {
      // Clear monitoring
      if ((instance as any).monitoringInterval) {
        clearInterval((instance as any).monitoringInterval);
      }

      // Clear global WebRTC room marker
      const roomName = `reportforge-${instance.reportId}`;
      const existingRoomKey = `webrtc-${roomName}`;
      if ((globalThis as any)[existingRoomKey]) {
        delete (globalThis as any)[existingRoomKey];
        console.log(`🧹 [COLLAB-SERVICE] Cleared global WebRTC room marker for [${instance.reportId}]`);
      }

      // Destroy providers carefully to avoid React Strict Mode issues
      if (instance.websocketProvider) {
        try {
          instance.websocketProvider.destroy();
        } catch (error) {
          console.warn(`⚠️ [COLLAB-SERVICE] Error destroying WebSocket provider for [${instance.reportId}]:`, error);
        }
      }
      
      if (instance.webrtcProvider) {
        try {
          instance.webrtcProvider.destroy();
        } catch (error) {
          console.warn(`⚠️ [COLLAB-SERVICE] Error destroying WebRTC provider for [${instance.reportId}]:`, error);
        }
      }
      
      if (instance.indexeddbProvider) {
        try {
          instance.indexeddbProvider.destroy();
        } catch (error) {
          console.warn(`⚠️ [COLLAB-SERVICE] Error destroying IndexedDB provider for [${instance.reportId}]:`, error);
        }
      }
      
      if (instance.doc) {
        try {
          instance.doc.destroy();
        } catch (error) {
          console.warn(`⚠️ [COLLAB-SERVICE] Error destroying Y.Doc for [${instance.reportId}]:`, error);
        }
      }
      
      this.globalState.deleteInstance(instance.reportId);
      console.log(`✅ [COLLAB-SERVICE] Successfully destroyed global instance for [${instance.reportId}]`);
    } catch (error) {
      console.warn(`⚠️ [COLLAB-SERVICE] Error destroying instance for [${instance.reportId}]:`, error);
    }
  }

  getInstance(reportId: string): CollaborationInstance | undefined {
    return this.globalState.getInstances().get(reportId);
  }

  // Get active users for a report
  getActiveUsers(reportId: string): CollaborationUser[] {
    const instance = this.globalState.getInstances().get(reportId);
    if (!instance) return [];

    const provider = instance.websocketProvider || instance.webrtcProvider;
    if (!provider?.awareness) return [];

    const states = provider.awareness.getStates();
    return Array.from(states.values())
      .map((state: any) => state.user)
      .filter((user: any) => user && user.id);
  }

  // Update configuration
  updateConfig(config: Partial<CollaborationConfig>): void {
    this.config = { 
      ...this.config, 
      ...config,
      // Ensure websocketUrl is always a string
      websocketUrl: config.websocketUrl || this.config.websocketUrl
    };
  }

  // Debug method
  listInstances(): void {
    const instances = this.globalState.getInstances();
    console.log('🔍 [COLLAB-SERVICE] Active global instances:', 
      Array.from(instances.entries()).map(([id, instance]) => ({
        reportId: id,
        userId: instance.userId,
        user: instance.user.name,
        refCount: instance.refCount,
        reactComponentCount: instance.reactComponentCount,
        isOnline: instance.isOnline,
        hasWebSocket: !!instance.websocketProvider,
        hasWebRTC: !!instance.webrtcProvider,
        created: instance.created.toISOString()
      }))
    );
  }
}

// Export singleton instance
export const collaborationManager = new CollaborationManager();

// Make available for debugging
if (typeof window !== 'undefined') {
  (window as any).collaborationManager = collaborationManager;
} 