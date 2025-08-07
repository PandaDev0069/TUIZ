const gameConfig = require('../config/gameConfig');
const SecurityUtils = require('./SecurityUtils');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    // Maximum players per room (from config)
    this.MAX_PLAYERS_PER_ROOM = gameConfig.game.maxPlayersPerRoom;
  }

  // Create a new game room with settings
  createRoom(hostName, questionSetId, gameSettings = {}) {
    // Generate unique room code
    const roomCode = this.generateRoomCode();
    
    // Initialize room with game settings
    this.rooms.set(roomCode, {
      gameId: roomCode,
      hostName: hostName,
      questionSetId: questionSetId,
      gameSettings: gameSettings,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      players: new Map(),
      scores: new Map()
    });

    SecurityUtils.safeLog('info', 'Created game room', {
      roomCode: roomCode,
      hostName: hostName
    });
    
    return roomCode;
  }

  // Generate a unique 6-digit room code
  generateRoomCode() {
    let roomCode;
    do {
      roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(roomCode));
    return roomCode;
  }

  // Get room by ID
  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  // Get all rooms (for debugging/admin)
  getAllRooms() {
    const roomsData = {};
    this.rooms.forEach((room, code) => {
      roomsData[code] = {
        gameId: room.gameId,
        hostName: room.hostName,
        status: room.status,
        playerCount: room.players.size,
        questionSetId: room.questionSetId,
        settings: room.gameSettings,
        createdAt: room.createdAt
      };
    });
    return roomsData;
  }

  // Update game settings (only during lobby phase)
  updateGameSettings(roomCode, newSettings) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'waiting') {
      return { success: false, error: 'Settings can only be changed during lobby phase' };
    }

    // Merge new settings with existing ones
    room.gameSettings = {
      ...room.gameSettings,
      ...newSettings
    };

    SecurityUtils.safeLog('info', 'Updated settings for room', {
      roomCode: roomCode,
      newSettings: newSettings
    });
    
    return { success: true, settings: room.gameSettings };
  }

  // Remove a room (cleanup)
  removeRoom(roomCode) {
    const removed = this.rooms.delete(roomCode);
    if (removed) {
      SecurityUtils.safeLog('info', 'Removed room', {
        roomCode: roomCode
      });
    }
    return removed;
  }

  // Find room by database gameId (UUID)
  findRoomByGameId(gameId) {
    for (const [code, roomData] of this.rooms.entries()) {
      if (roomData.gameId === gameId) {
        return { roomCode: code, room: roomData };
      }
    }
    return null;
  }

  // Get all rooms map for direct access
  getAllRoomsMap() {
    return this.rooms;
  }
}

module.exports = new RoomManager();