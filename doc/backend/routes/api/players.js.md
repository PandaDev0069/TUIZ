# routes/api/players.js

## Imports
- express
- ../../utils/logger

## Exports
- (dbManager) => {
  // Get all players in a game
  router.get('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params

## Functions

## Variables
- express
- logger
- router

## Data Flow
- Inputs: express, ../../utils/logger
- Outputs: (dbManager) => {
  // Get all players in a game
  router.get('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params