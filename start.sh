#!/bin/bash

# VoiceFlow CRM Quickstart Script for Unix/WSL
echo "==================================================="
echo "            VoiceFlow Calling CRM Startup          "
echo "==================================================="
echo ""

# Step 1: Start Database
echo "[1/4] Checking MongoDB database setup..."
if command -v docker &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        echo "Docker detected. Starting MongoDB container (docker-compose)..."
        docker-compose up -d
    elif docker compose version &> /dev/null; then
        echo "Docker detected. Starting MongoDB container (docker compose)..."
        docker compose up -d
    else
        echo "Docker found but no compose plugin available."
        echo "Please make sure your local MongoDB database is running"
        echo "and matches MONGODB_URI inside backend/.env."
    fi
    # Give MongoDB a moment to accept connections
    sleep 3
else
    echo "Docker is not running or not installed."
    echo "Please make sure your local MongoDB database is running"
    echo "and matches MONGODB_URI inside backend/.env."
fi
echo ""

# Step 2: Setup Backend
echo "[2/4] Setting up Backend Node.js server..."
cd backend
echo "Installing backend node modules..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed in backend directory."
    exit 1
fi

echo "Seeding MongoDB demo accounts and sample contacts..."
npm run seed
if [ $? -ne 0 ]; then
    echo "[ERROR] MongoDB seed failed. Check MongoDB and MONGODB_URI in backend/.env"
    exit 1
fi
cd ..
echo ""

# Step 3: Setup Frontend
echo "[3/4] Setting up Frontend React application..."
cd frontend
echo "Installing frontend node modules..."
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] npm install failed in frontend directory."
    exit 1
fi
cd ..
echo ""

# Step 4: Run Services
echo "[4/4] Launching Backend and Frontend servers..."
echo ""

# Start backend in background
(cd backend && npm run dev) &
BACKEND_PID=$!

# Start frontend in background
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo "==================================================="
echo " SETUP COMPLETED SUCCESSFULLY!"
echo "==================================================="
echo " - Backend runs on PID $BACKEND_PID (Port 5000)"
echo " - Frontend runs on PID $FRONTEND_PID (Port 5173)"
echo " - Access the CRM at: http://localhost:5173"
echo "==================================================="
echo "Press Ctrl+C to stop both servers."

# Wait for both processes
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM EXIT
wait
