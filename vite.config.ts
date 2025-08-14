import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Custom plugin for better port management
const portManagerPlugin = (): Plugin => {
  return {
    name: 'port-manager',
    configureServer(server) {
      const originalListen = server.listen.bind(server);
      
      server.listen = function(port?: number, ...args: any[]) {
        const startingPort = port || 3000;
        
        // Log the attempt
        console.log(`\n🚀 [DEV-SERVER] Starting ReportForge development server...`);
        console.log(`📡 [DEV-SERVER] Trying port ${startingPort}...`);
        
        return originalListen(port, ...args).catch((error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`⚠️  [DEV-SERVER] Port ${startingPort} is busy, Vite will find the next available port...`);
          }
          throw error;
        });
      };

      // Track if we've already logged the port to avoid spam
      let portLogged = false;
      
      // Listen for server ready event to log final port
      server.middlewares.use((req, res, next) => {
        if (!server.resolvedUrls || portLogged) {
          next();
          return;
        }
        
        // This will run once when server is ready
        const port = server.config.server.port;
        const actualPort = server.resolvedUrls.local[0]?.split(':').pop()?.replace('/', '');
        
        if (actualPort && actualPort !== String(port)) {
          console.log(`✅ [DEV-SERVER] Found available port: ${actualPort}`);
          console.log(`🌐 [DEV-SERVER] ReportForge is running at: http://localhost:${actualPort}`);
        } else {
          console.log(`✅ [DEV-SERVER] ReportForge started successfully on port ${port}`);
        }
        
        portLogged = true;
        next();
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    portManagerPlugin()
  ],
  server: {
    port: 3000,
    strictPort: false, // Allow Vite to automatically find next available port
    host: true,
    open: true,
    // Additional port configuration for better control
    cors: true,
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ['react-is']
  }
})
