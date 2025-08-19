# sockets/index.js

## Imports
- socket.io
- ../utils/logger
- ../config/env
- ../config/cors
- ./events/sessionRestore
- ./GameHub

## Exports
- { initializeSocketIO }

## Functions
- initializeSocketIO

## Variables
- logger
- sessionRestoreEvents
- GameHub

## Data Flow
- Inputs: socket.io, ../utils/logger, ../config/env, ../config/cors, ./events/sessionRestore, ./GameHub
- Outputs: { initializeSocketIO }