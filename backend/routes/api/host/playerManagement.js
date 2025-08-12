// Host Player Management Routes - Backend API Implementation
// Phase 6: Complete Missing Backend Infrastructure

const express = require('express');
const router = express.Router();
const { validateHostPermission, validateGameState } = require('../../../middleware/hostAuth');
const RoomManager = require('../../../utils/RoomManager');
const logger = require('../../../utils/logger');

/**
 * Host Player Management Endpoints
 * Implements all missing player management functionality
 */

// Add middleware to attach io instance to request
router.use((req, res, next) => {
  req.io = require('../../../server').getIO();
  next();
});

// Kick Player
router.post('/:gameId/kick-player',
  validateHostPermission,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId, reason = 'host_decision', banDuration } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID required' });
      }

      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const player = room.players[playerId];
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const kickedAt = new Date().toISOString();
      const kickRecord = {
        playerId,
        playerName: player.name,
        reason,
        kickedAt,
        hostId: req.user.id,
        banDuration: banDuration || null
      };

      // Add to kicked players list
      room.kickedPlayers = room.kickedPlayers || {};
      room.kickedPlayers[playerId] = kickRecord;

      // Remove from active players
      delete room.players[playerId];

      // Update game state
      room.gameState = {
        ...room.gameState,
        totalPlayers: Object.keys(room.players).length,
        lastAction: {
          type: 'kick_player',
          playerId,
          reason,
          timestamp: kickedAt
        }
      };

      // Notify kicked player
      req.io.to(player.socketId).emit('player:kicked', {
        gameId,
        reason,
        kickedAt,
        banDuration,
        message: `You have been removed from the game by the host`
      });

      // Broadcast to remaining players
      req.io.to(gameId).emit('player:removed', {
        gameId,
        playerId,
        playerName: player.name,
        reason: 'kicked_by_host',
        remainingPlayers: Object.keys(room.players).length
      });

      // Disconnect player's socket from room
      if (player.socketId) {
        const socket = req.io.sockets.connected[player.socketId];
        if (socket) {
          socket.leave(gameId);
        }
      }

      // Log host action
      logger.info(`Player ${playerId} kicked from game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        playerId,
        playerName: player.name,
        reason,
        kickedAt
      });

      res.json({
        success: true,
        kickedPlayer: {
          playerId,
          playerName: player.name,
          kickedAt,
          reason
        },
        gameState: {
          totalPlayers: Object.keys(room.players).length,
          activePlayers: Object.keys(room.players)
        }
      });

    } catch (error) {
      logger.error('Failed to kick player:', error);
      res.status(500).json({ error: 'Failed to kick player' });
    }
  }
);

// Mute Player
router.post('/:gameId/mute-player',
  validateHostPermission,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId, duration = 300000, reason = 'host_moderation' } = req.body; // 5 minutes default
      
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID required' });
      }

      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const player = room.players[playerId];
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const mutedAt = new Date().toISOString();
      const unmuteAt = new Date(Date.now() + duration).toISOString();
      
      const muteRecord = {
        playerId,
        mutedAt,
        unmuteAt,
        duration,
        reason,
        hostId: req.user.id
      };

      // Add mute to player record
      room.players[playerId] = {
        ...player,
        isMuted: true,
        muteInfo: muteRecord
      };

      // Track muted players
      room.mutedPlayers = room.mutedPlayers || {};
      room.mutedPlayers[playerId] = muteRecord;

      // Set auto-unmute timer
      setTimeout(() => {
        if (room.players[playerId] && room.players[playerId].isMuted) {
          room.players[playerId].isMuted = false;
          delete room.players[playerId].muteInfo;
          delete room.mutedPlayers[playerId];

          // Notify player and room
          req.io.to(playerId).emit('player:unmuted', {
            gameId,
            unmuteReason: 'auto_timeout'
          });

          req.io.to(gameId).emit('player:status:updated', {
            gameId,
            playerId,
            status: { isMuted: false }
          });
        }
      }, duration);

      // Notify muted player
      req.io.to(player.socketId).emit('player:muted', {
        gameId,
        duration,
        unmuteAt,
        reason,
        message: `You have been muted by the host for ${Math.round(duration / 60000)} minutes`
      });

      // Broadcast to other players
      req.io.to(gameId).emit('player:status:updated', {
        gameId,
        playerId,
        playerName: player.name,
        status: { isMuted: true, muteDuration: duration }
      });

      // Log host action
      logger.info(`Player ${playerId} muted in game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        playerId,
        playerName: player.name,
        duration,
        reason,
        mutedAt
      });

      res.json({
        success: true,
        mutedPlayer: {
          playerId,
          playerName: player.name,
          mutedAt,
          unmuteAt,
          duration,
          reason
        },
        totalMutedPlayers: Object.keys(room.mutedPlayers).length
      });

    } catch (error) {
      logger.error('Failed to mute player:', error);
      res.status(500).json({ error: 'Failed to mute player' });
    }
  }
);

// Unmute Player
router.post('/:gameId/unmute-player',
  validateHostPermission,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { playerId, reason = 'host_decision' } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID required' });
      }

      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const player = room.players[playerId];
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      if (!player.isMuted) {
        return res.status(400).json({ error: 'Player is not muted' });
      }

      const unmutedAt = new Date().toISOString();

      // Remove mute from player
      room.players[playerId] = {
        ...player,
        isMuted: false,
        unmuteInfo: {
          unmutedAt,
          reason,
          hostId: req.user.id
        }
      };
      delete room.players[playerId].muteInfo;

      // Remove from muted players tracking
      delete room.mutedPlayers[playerId];

      // Notify unmuted player
      req.io.to(player.socketId).emit('player:unmuted', {
        gameId,
        unmutedAt,
        reason,
        message: 'You have been unmuted by the host'
      });

      // Broadcast to room
      req.io.to(gameId).emit('player:status:updated', {
        gameId,
        playerId,
        playerName: player.name,
        status: { isMuted: false }
      });

      // Log host action
      logger.info(`Player ${playerId} unmuted in game ${gameId}`, {
        gameId,
        hostId: req.user.id,
        playerId,
        playerName: player.name,
        reason,
        unmutedAt
      });

      res.json({
        success: true,
        unmutedPlayer: {
          playerId,
          playerName: player.name,
          unmutedAt,
          reason
        },
        totalMutedPlayers: Object.keys(room.mutedPlayers || {}).length
      });

    } catch (error) {
      logger.error('Failed to unmute player:', error);
      res.status(500).json({ error: 'Failed to unmute player' });
    }
  }
);

// Transfer Host
router.post('/:gameId/transfer-host',
  validateHostPermission,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const { newHostId, reason = 'host_transfer' } = req.body;
      
      if (!newHostId) {
        return res.status(400).json({ error: 'New host player ID required' });
      }

      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const newHost = room.players[newHostId];
      if (!newHost) {
        return res.status(404).json({ error: 'New host player not found' });
      }

      const transferredAt = new Date().toISOString();
      const currentHostId = req.user.id;

      // Update room host
      room.hostId = newHostId;
      room.hostTransferHistory = room.hostTransferHistory || [];
      room.hostTransferHistory.push({
        from: currentHostId,
        to: newHostId,
        reason,
        transferredAt
      });

      // Update player roles
      if (room.players[currentHostId]) {
        room.players[currentHostId].isHost = false;
      }
      room.players[newHostId].isHost = true;

      // Notify new host
      req.io.to(newHost.socketId).emit('host:transferred:to', {
        gameId,
        transferredAt,
        reason,
        message: 'You are now the host of this game',
        hostControls: true
      });

      // Notify old host
      req.io.to(req.user.socketId).emit('host:transferred:from', {
        gameId,
        newHostId,
        newHostName: newHost.name,
        transferredAt,
        message: 'Host privileges transferred'
      });

      // Broadcast to all players
      req.io.to(gameId).emit('host:changed', {
        gameId,
        newHostId,
        newHostName: newHost.name,
        transferredAt,
        message: `${newHost.name} is now the host`
      });

      // Log host transfer
      logger.info(`Host transferred in game ${gameId}`, {
        gameId,
        fromHostId: currentHostId,
        toHostId: newHostId,
        newHostName: newHost.name,
        reason,
        transferredAt
      });

      res.json({
        success: true,
        hostTransfer: {
          newHostId,
          newHostName: newHost.name,
          transferredAt,
          reason
        },
        gameState: {
          hostId: newHostId,
          transferHistory: room.hostTransferHistory.length
        }
      });

    } catch (error) {
      logger.error('Failed to transfer host:', error);
      res.status(500).json({ error: 'Failed to transfer host' });
    }
  }
);

// Get Player Management Status
router.get('/:gameId/player-management',
  validateHostPermission,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      
      const room = RoomManager.getRoom(gameId);
      if (!room) {
        return res.status(404).json({ error: 'Game room not found' });
      }

      const activePlayers = Object.values(room.players).map(player => ({
        id: player.id,
        name: player.name,
        score: player.score || 0,
        isConnected: player.isConnected !== false,
        isMuted: player.isMuted || false,
        isHost: player.isHost || false,
        joinedAt: player.joinedAt,
        lastActivity: player.lastActivity
      }));

      const mutedPlayers = Object.values(room.mutedPlayers || {});
      const kickedPlayers = Object.values(room.kickedPlayers || {});

      res.json({
        success: true,
        playerManagement: {
          activePlayers,
          totalActive: activePlayers.length,
          mutedPlayers,
          totalMuted: mutedPlayers.length,
          kickedPlayers,
          totalKicked: kickedPlayers.length,
          hostId: room.hostId,
          hostTransferHistory: room.hostTransferHistory || []
        }
      });

    } catch (error) {
      logger.error('Failed to get player management status:', error);
      res.status(500).json({ error: 'Failed to get player management status' });
    }
  }
);

module.exports = router;
