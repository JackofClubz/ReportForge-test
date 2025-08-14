# Live Collaboration in ReportForge

ReportForge now supports real-time collaboration that goes beyond tab-to-tab, allowing multiple users to work on the same report simultaneously from different devices and browsers.

## Features

- **Real-time editing**: See changes from other users instantly
- **User presence**: See who's currently editing the document
- **Conflict resolution**: Automatic merging of simultaneous edits
- **Offline support**: Continue working offline with automatic sync when reconnected
- **Cross-device**: Works across different browsers, devices, and networks

## Architecture

The collaboration system uses a hybrid approach:

1. **WebSocket Provider**: For real cross-user collaboration via a central server
2. **WebRTC Provider**: For peer-to-peer collaboration and local performance
3. **IndexedDB**: For offline persistence and caching

## Setup

### Development

1. **Start the collaboration server**:
   ```bash
   npm run dev:collab
   ```
   This starts both the Vite dev server and the WebSocket collaboration server.

2. **Or start them separately**:
   ```bash
   # Terminal 1: Start the WebSocket server
   npm run ws-server
   
   # Terminal 2: Start the dev server
   npm run dev
   ```

### Production

For production, you'll need to deploy the WebSocket server separately:

1. **Deploy the WebSocket server**:
   ```bash
   # On your server
   node websocket-server.js
   ```

2. **Configure the WebSocket URL**:
   Update the `getWebSocketUrl()` method in `src/lib/services/collaborationService.ts` to point to your production WebSocket server.

## Usage

### For Users

1. **Open a report for editing**: Navigate to any report and click "Edit"
2. **See collaboration status**: The top-right shows your connection status and active collaborators
3. **Real-time editing**: Start typing - other users will see your changes instantly
4. **User presence**: See colored avatars of other users currently editing

### For Developers

#### Debugging

The collaboration system exposes debug objects in the browser console:

```javascript
// Global collaboration manager
window.collaborationManager.listInstances();

// Current editor debug info
window.reportEditorDebug.forceEditorUpdate();
```

#### Configuration

You can configure collaboration behavior in `src/lib/services/collaborationService.ts`:

```typescript
// Update configuration
collaborationManager.updateConfig({
  enableWebSocket: true,
  enableWebRTC: true,
  websocketUrl: 'ws://your-server:1234',
  signalServers: ['wss://your-signaling-server.com']
});
```

## Technical Details

### WebSocket Server

The WebSocket server (`websocket-server.js`) provides:

- **Room-based collaboration**: Each report gets its own room
- **Authentication support**: Optional JWT token verification
- **Connection monitoring**: Logs active rooms and connections
- **Graceful shutdown**: Proper cleanup on server restart

### Client-side Architecture

The collaboration service (`src/lib/services/collaborationService.ts`) manages:

- **Connection lifecycle**: Automatic connection/reconnection
- **User management**: Fetches user info from Supabase
- **Presence tracking**: Real-time user awareness
- **Event system**: Custom events for UI updates

### UI Components

- **CollaborationPresence**: Shows connection status and active users
- **User avatars**: Color-coded user indicators
- **Connection status**: Online/offline indicators

## Security

### Authentication

The WebSocket server supports JWT token authentication:

```javascript
// Tokens are automatically included from Supabase auth
const token = await supabase.auth.getSession().access_token;
```

### Room Security

- **Room passwords**: Each report room has a unique password
- **Domain validation**: Optional domain-based access control
- **User verification**: Integration with Supabase auth

## Troubleshooting

### Common Issues

1. **"Offline" status**: 
   - Check if the WebSocket server is running
   - Verify the WebSocket URL configuration
   - Check browser console for connection errors

2. **Changes not syncing**:
   - Ensure both users are in the same report
   - Check network connectivity
   - Try refreshing the page

3. **WebSocket server won't start**:
   - Check if port 1234 is available
   - Install dependencies: `npm install`
   - Check Node.js version (requires Node 16+)

### Debug Commands

```javascript
// Check collaboration status
window.collaborationManager.listInstances();

// Force editor update
window.reportEditorDebug?.forceEditorUpdate();

// Check WebSocket connection
const instance = window.collaborationManager.getInstance('report-id');
console.log('WebSocket connected:', instance?.websocketProvider?.wsconnected);
console.log('WebRTC connected:', instance?.webrtcProvider?.connected);
```

## Performance

### Optimization Tips

1. **Use WebSocket for primary collaboration**: More reliable than WebRTC
2. **Enable WebRTC as fallback**: Better performance for local networks
3. **Monitor connection status**: Implement reconnection logic
4. **Batch updates**: Avoid too frequent saves during collaboration

### Scaling

For high-traffic scenarios:

1. **Load balancing**: Use multiple WebSocket servers with sticky sessions
2. **Redis backend**: Store Y.js documents in Redis for persistence
3. **CDN**: Serve static assets from CDN
4. **Monitoring**: Track connection counts and document sizes

## Future Enhancements

- **Cursor tracking**: Show real-time cursor positions
- **Comment system**: Add collaborative comments
- **Version history**: Track document versions
- **Conflict indicators**: Visual indicators for merge conflicts
- **Mobile optimization**: Better mobile collaboration experience 