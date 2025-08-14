#!/bin/bash

PORT=3000
PROJECT_DIR="/Users/paulgenberg/Documents/Developer/ReportForge"

echo "Starting ReportForge development server watchdog..."
echo "Using port $PORT"


# Function to check if port is in use and kill the process if it exists
cleanup_port() {
    local pid=$(lsof -ti :$PORT)
    if [ ! -z "$pid" ]; then
        echo "Port $PORT is in use by process $pid. Killing it..."
        kill -9 $pid
        sleep 1
    fi
}

# Function to start the development server
start_server() {
    #Get to the project directory
    cd "$PROJECT_DIR" || {
        echo "Could not cd into $PROJECT_DIR"
        exit 1
    }
    
    # Set VITE_PORT environment variable
    export VITE_PORT=$PORT
    npm run dev
    exit_code=$?
    
    # Only restart if the server crashed (exit code != 0 and != 130 [SIGINT])
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 130 ]; then
        echo "Server crashed with exit code $exit_code. Restarting in 2 seconds..."
        sleep 2
        return 1
    else
        echo "Server stopped normally."
        return 0
    fi
}

# Initial port cleanup
cleanup_port

# Start server and restart only on crashes
while true; do
    echo "Starting development server..."
    start_server
    if [ $? -eq 0 ]; then
        break
    fi
done 