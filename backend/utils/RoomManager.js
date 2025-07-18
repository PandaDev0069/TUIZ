class RoomManager {
  constructor() {
    this.rooms = new Map();
    // Track which room a player is in for faster lookups
    this.playerRooms = new Map();
    // Maximum players per room (as per requirements: 200-300)
    this.MAX_PLAYERS_PER_ROOM = 300;
  }

  joinRoom(roomCode, playerId, name) {
    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, { players: new Map() });
      console.log(`📝 Created new room: ${roomCode}`);
    }
    
    const room = this.rooms.get(roomCode);
    
    // Check room capacity
    if (room.players.size >= this.MAX_PLAYERS_PER_ROOM) {
      console.log(`⛔ Room ${roomCode} is full (${this.MAX_PLAYERS_PER_ROOM} players max)`);
      return { error: 'Room is full' };
    }
    
    // If player is already in the room, update their name
    if (room.players.has(playerId)) {
      room.players.get(playerId).name = name;
      console.log(`🔄 Player updated in room ${roomCode}:
        ID: ${playerId}
        Name: ${name}
        Current players: ${room.players.size}`);
    } else {
      // Add new player to room
      room.players.set(playerId, { id: playerId, name });
      // Track which room this player is in
      this.playerRooms.set(playerId, roomCode);
      console.log(`➕ New player joined room ${roomCode}:
        ID: ${playerId}
        Name: ${name}
        Current players: ${room.players.size}`);
    }

    // Return array of all players in room
    return Array.from(room.players.values());
  }

  getPlayers(roomCode) {
    const room = this.rooms.get(roomCode);
    return room ? Array.from(room.players.values()) : [];
  }

  leaveRoom(playerId) {
    // Get room code from player tracking
    const roomCode = this.playerRooms.get(playerId);
    if (!roomCode) {
      console.log(`⚠️ Player ${playerId} not found in any room`);
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      console.log(`⚠️ Room ${roomCode} not found`);
      return;
    }

    // Get player info before removing
    const player = room.players.get(playerId);
    const playerName = player ? player.name : 'Unknown';

    // Remove player from room
    room.players.delete(playerId);
    console.log(`👋 Player left room ${roomCode}:
      Name: ${playerName}
      ID: ${playerId}`);
    
    // Remove player tracking
    this.playerRooms.delete(playerId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      console.log(`📤 Deleted empty room: ${roomCode}`);
    } else {
      console.log(`📊 Room ${roomCode} has ${room.players.size} players remaining`);
    }

    return Array.from(room.players.values());
  }
}

module.exports = new RoomManager();
// This module manages room creation, player joining, and player leaving.