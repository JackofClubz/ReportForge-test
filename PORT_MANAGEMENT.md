# 🚀 ReportForge Port Management

ReportForge now includes automatic port detection and management tools to handle port conflicts gracefully.

## ✨ Features

### 🔄 Automatic Port Detection
- **Smart Port Rotation**: Vite automatically finds the next available port when 3000 is busy
- **Helpful Console Output**: Clear feedback about which port is being used
- **No More Manual Port Management**: Just run `npm run dev` and it works!

### 📡 Development Server Options

```bash
# Standard development (auto-detects available port)
npm run dev

# Force specific ports
npm run dev:3001    # Start on port 3001
npm run dev:3002    # Start on port 3002
npm run dev:any     # Let Vite pick any available port

# Auto-open browser with host binding
npm run dev:auto
```

### 🛠️ Port Management Tools

```bash
# Check if a port is available
npm run port:check 3000

# Kill processes on a specific port
npm run port:kill 3000

# Find the next available port
npm run port:find 3000
```

## 🎯 How It Works

### Automatic Port Detection
When you run `npm run dev`:

1. **Tries port 3000** first (default)
2. **If busy**, Vite automatically tries 3001, 3002, etc.
3. **Console shows** which port was selected
4. **Browser opens** automatically on the correct port

### Example Console Output
```
🚀 [DEV-SERVER] Starting ReportForge development server...
📡 [DEV-SERVER] Trying port 3000...
⚠️  [DEV-SERVER] Port 3000 is busy, Vite will find the next available port...
✅ [DEV-SERVER] Found available port: 3001
🌐 [DEV-SERVER] ReportForge is running at: http://localhost:3001
```

## 🔧 Port Conflict Resolution

### Scenario 1: Port 3000 is Busy
```bash
# Just run the dev command - it will auto-detect
npm run dev
# → Automatically starts on 3001, 3002, etc.
```

### Scenario 2: Want to Free Up a Specific Port
```bash
# Check what's using port 3000
npm run port:check 3000

# Kill processes on port 3000
npm run port:kill 3000

# Now start normally
npm run dev
```

### Scenario 3: Want a Specific Port
```bash
# Start directly on port 3001
npm run dev:3001

# Or use Vite's built-in flag
npm run dev -- --port 3002
```

## 🎛️ Configuration

The port management is configured in `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 3000,           // Preferred port
    strictPort: false,    // Allow port rotation
    host: true,          // Allow external connections
    open: true,          // Auto-open browser
  }
})
```

## 🚨 Troubleshooting

### Problem: Can't Kill Process
- **Solution**: Run terminal as Administrator
- **Alternative**: Restart your computer

### Problem: Port Still Shows as Busy
- **Check**: Some processes may take a moment to release the port
- **Solution**: Wait 10-15 seconds and try again

### Problem: Browser Doesn't Open
- **Check**: Your default browser settings
- **Solution**: Manually navigate to the URL shown in console

## 🎉 Benefits

✅ **No More Manual Port Conflicts**  
✅ **Automatic Browser Opening**  
✅ **Clear Console Feedback**  
✅ **Multiple Development Options**  
✅ **Easy Port Management Tools**  

---

**Happy coding with ReportForge! 🚀** 