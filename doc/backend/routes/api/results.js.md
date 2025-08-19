# routes/api/results.js

## Imports
- express
- ../../utils/logger

## Exports
- (dbManager) => {
  // Get game results for a specific game
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
  // Get game results for a specific game
  router.get('/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params