#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI color codes for better console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Check what's running on a specific port
async function checkPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    if (stdout.trim()) {
      const lines = stdout.trim().split('\n');
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        return { line: line.trim(), pid };
      });
      return processes;
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Kill a process by PID
async function killProcess(pid) {
  try {
    await execAsync(`taskkill /PID ${pid} /F`);
    return true;
  } catch (error) {
    log(`❌ Failed to kill process ${pid}: ${error.message}`, colors.red);
    return false;
  }
}

// Find next available port starting from a given port
async function findAvailablePort(startPort = 3000, maxAttempts = 10) {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    const processes = await checkPort(port);
    if (processes.length === 0) {
      return port;
    }
  }
  return null;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'check':
      const port = args[1] || 3000;
      log(`🔍 Checking port ${port}...`, colors.blue);
      const processes = await checkPort(port);
      
      if (processes.length === 0) {
        log(`✅ Port ${port} is available!`, colors.green);
      } else {
        log(`⚠️  Port ${port} is in use:`, colors.yellow);
        processes.forEach(proc => {
          log(`   PID ${proc.pid}: ${proc.line}`, colors.yellow);
        });
      }
      break;
      
    case 'kill':
      const killPort = args[1];
      if (!killPort) {
        log(`❌ Please specify a port: npm run port:kill 3000`, colors.red);
        process.exit(1);
      }
      
      log(`🔍 Finding processes on port ${killPort}...`, colors.blue);
      const killProcesses = await checkPort(killPort);
      
      if (killProcesses.length === 0) {
        log(`✅ No processes found on port ${killPort}`, colors.green);
      } else {
        log(`⚠️  Found ${killProcesses.length} process(es) on port ${killPort}`, colors.yellow);
        
        for (const proc of killProcesses) {
          log(`🔄 Killing PID ${proc.pid}...`, colors.blue);
          const success = await killProcess(proc.pid);
          if (success) {
            log(`✅ Successfully killed PID ${proc.pid}`, colors.green);
          }
        }
        
        // Verify port is now free
        const remainingProcesses = await checkPort(killPort);
        if (remainingProcesses.length === 0) {
          log(`🎉 Port ${killPort} is now available!`, colors.green);
        } else {
          log(`⚠️  Some processes may still be running on port ${killPort}`, colors.yellow);
        }
      }
      break;
      
    case 'find':
      const startPort = parseInt(args[1]) || 3000;
      log(`🔍 Finding next available port starting from ${startPort}...`, colors.blue);
      
      const availablePort = await findAvailablePort(startPort);
      if (availablePort) {
        log(`✅ Next available port: ${availablePort}`, colors.green);
        log(`💡 Run: npm run dev -- --port ${availablePort}`, colors.blue);
      } else {
        log(`❌ No available ports found in range ${startPort}-${startPort + 9}`, colors.red);
      }
      break;
      
    default:
      log(`🚀 ReportForge Port Manager`, colors.bold + colors.blue);
      log(`Usage:`, colors.bold);
      log(`  node scripts/port-manager.js check [port]     - Check if port is available`);
      log(`  node scripts/port-manager.js kill <port>      - Kill processes on port`);
      log(`  node scripts/port-manager.js find [startPort] - Find next available port`);
      log(``);
      log(`Examples:`, colors.bold);
      log(`  node scripts/port-manager.js check 3000`);
      log(`  node scripts/port-manager.js kill 3000`);  
      log(`  node scripts/port-manager.js find 3000`);
      break;
  }
}

main().catch(error => {
  log(`❌ Error: ${error.message}`, colors.red);
  process.exit(1);
}); 