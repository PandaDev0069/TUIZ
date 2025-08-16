import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useHostSocket } from '../hooks/useSocket'
import ConnectionStatus from '../components/ConnectionStatus'
import GameSettingsPanel from '../components/host/settings/GameSettingsPanel'
import CustomDropdown from '../components/ui/CustomDropdown'
import { FaRocket, FaUserPlus, FaUserMinus, FaSearch, FaChevronDown, FaDownload } from 'react-icons/fa'
import { 
  FiSettings, 
  FiUsers, 
  FiUser, 
  FiClock, 
  FiTarget, 
  FiAward, 
  FiSmartphone, 
  FiBarChart,
  FiBook,
  FiInfo
} from 'react-icons/fi'
import './hostLobby.css'

// Custom Gamepad SVG Component
const GamepadIcon = ({ className }) => (
  <svg 
    className={className} 
    height="1em" 
    width="1em" 
    version="1.1" 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 53.626 53.626" 
    fill="currentColor"
    style={{ 
      verticalAlign: '-0.125em',
      display: 'inline-block'
    }}
  >
    <path d="M48.831,15.334c-7.083-11.637-17.753-3.541-17.753-3.541c-0.692,0.523-1.968,0.953-2.835,0.955 l-2.858,0.002c-0.867,0.001-2.143-0.429-2.834-0.952c0,0-10.671-8.098-17.755,3.539C-2.286,26.97,0.568,39.639,0.568,39.639 c0.5,3.102,2.148,5.172,5.258,4.912c3.101-0.259,9.832-8.354,9.832-8.354c0.556-0.667,1.721-1.212,2.586-1.212l17.134-0.003 c0.866,0,2.03,0.545,2.585,1.212c0,0,6.732,8.095,9.838,8.354c3.106,0.26,4.758-1.812,5.255-4.912 C53.055,39.636,55.914,26.969,48.831,15.334z M20.374,24.806H16.7v3.541c0,0-0.778,0.594-1.982,0.579 c-1.202-0.018-1.746-0.648-1.746-0.648v-3.471h-3.47c0,0-0.433-0.444-0.549-1.613c-0.114-1.169,0.479-2.114,0.479-2.114h3.675 v-3.674c0,0,0.756-0.405,1.843-0.374c1.088,0.034,1.885,0.443,1.885,0.443l-0.015,3.604h3.47c0,0,0.606,0.778,0.656,1.718 C20.996,23.738,20.374,24.806,20.374,24.806z M37.226,28.842c-1.609,0-2.906-1.301-2.906-2.908c0-1.61,1.297-2.908,2.906-2.908 c1.602,0,2.909,1.298,2.909,2.908C40.135,27.542,38.828,28.842,37.226,28.842z M37.226,20.841c-1.609,0-2.906-1.3-2.906-2.907 c0-1.61,1.297-2.908,2.906-2.908c1.602,0,2.909,1.298,2.909,2.908C40.135,19.542,38.828,20.841,37.226,20.841z M44.468,25.136 c-1.609,0-2.906-1.3-2.906-2.908c0-1.609,1.297-2.908,2.906-2.908c1.602,0,2.909,1.299,2.909,2.908 C47.377,23.836,46.07,25.136,44.468,25.136z"/>
  </svg>
)

function HostLobby() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { room, title, gameId, questionSetId } = state || {}
  
  // Use the host socket hook with session persistence
  const { 
    isConnected: hostConnected, 
    hostState, 
    sessionRestored,
    requestPlayerList,
    requestGameState,
    emit, 
    on, 
    off
  } = useHostSocket(gameId, room, questionSetId)
  
  // Map of currently connected players: name -> joinedAt (ms)
  const [connectedMap, setConnectedMap] = useState(new Map())
  const [showSettings, setShowSettings] = useState(false)
  const [playerAnimations, setPlayerAnimations] = useState(new Set())
  // Unified event log: { type: 'join' | 'left' | 'error' | 'info', name: string, time: number }
  const [logs, setLogs] = useState([])
  const [filterText, setFilterText] = useState('')
  const [groupBy, setGroupBy] = useState('chrono') // 'chrono' | 'status' | 'player'
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' | 'asc'
  const [nowTick, setNowTick] = useState(Date.now())


  useEffect(() => {
    if (!room || !title) {
      navigate('/dashboard')
      return
    }

    // Debug: Log socket information
    console.log('🔌 HostLobby useEffect - Socket state:', {
      hostConnected,
      sessionRestored,
      room,
      title
    });

    // Restore session data based on the new restoration system
    if (hostState) {
      if (import.meta.env.DEV) {
        console.log('🔄 Processing host state restoration:', hostState);
      }
      
      if (hostState.type === 'lobby' && hostState.lobbyState) {
        // Host restored to lobby
        const lobby = hostState.lobbyState;
        if (lobby.connectedPlayers && Array.isArray(lobby.connectedPlayers)) {
          const playerMap = new Map();
          lobby.connectedPlayers.forEach(player => {
            const playerName = player.name || player.playerName || player;
            const timestamp = player.joinedAt || player.joined_at;
            const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
            playerMap.set(playerName, {
              name: playerName,
              joinedAt: validTimestamp
            });
          });
          setConnectedMap(playerMap);
        }
      } else if (hostState.type === 'activeGame' && hostState.gameState) {
        // Host restored to active game - should redirect to quiz control
        const gameState = hostState.gameState;
        if (import.meta.env.DEV) {
          console.log('🎮 Host restored to active game, should redirect to quiz control');
        }
        // This case should be handled by redirecting to the correct page
        // For now, show connected players in lobby format
        if (gameState.connectedPlayers && Array.isArray(gameState.connectedPlayers)) {
          const playerMap = new Map();
          gameState.connectedPlayers.forEach(player => {
            const playerName = player.name || player.playerName || player;
            const timestamp = player.joinedAt || player.joined_at;
            const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
            playerMap.set(playerName, {
              name: playerName,
              joinedAt: validTimestamp
            });
          });
          setConnectedMap(playerMap);
        }
      } else if (hostState.type === 'completed') {
        // Host restored to completed game
        if (import.meta.env.DEV) {
          console.log('🏁 Game completed, should show results');
        }
      }
      
      // Handle legacy restoration format or direct player data
      if (hostState.connectedPlayers && Array.isArray(hostState.connectedPlayers)) {
        if (import.meta.env.DEV) {
          console.log('🔄 Processing connected players:', hostState.connectedPlayers.length, 'players');
        }
        if (hostState.connectedPlayers.length > 0 && Array.isArray(hostState.connectedPlayers[0])) {
          // Map entries format: [[name, {name, joinedAt}], ...]
          setConnectedMap(new Map(hostState.connectedPlayers));
        } else {
          // Array of player objects: [{name, joinedAt}, ...]
          const playerMap = new Map();
          hostState.connectedPlayers.forEach(player => {
            const playerName = player.name || player.playerName || player;
            const timestamp = player.joinedAt || player.joined_at;
            const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
            playerMap.set(playerName, {
              name: playerName,
              joinedAt: validTimestamp
            });
          });
          setConnectedMap(playerMap);
        }
      }
      
      if (hostState.logs) {
        if (import.meta.env.DEV) {
          console.log('🔄 Restoring logs from hostState:', hostState.logs.length, 'entries');
        }
        setLogs(hostState.logs);
      }
      
      // Add restoration success log
      setLogs(prev => [...prev, {
        type: 'info',
        name: 'SYSTEM',
        time: Date.now(),
        message: `ホストセッション復元完了 (${hostState.type || 'legacy'})`
      }]);
    }

    // Listen for host game rejoin confirmation and current player list
    const handleHostGameJoined = (data) => {
      // Update connected players from server data
      if (data.currentPlayers && Array.isArray(data.currentPlayers)) {
        const playerMap = new Map();
        data.currentPlayers.forEach(player => {
          const playerName = player.name || player.playerName || player;
          const timestamp = player.joinedAt || player.joined_at;
          const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
          playerMap.set(playerName, {
            name: playerName,
            joinedAt: validTimestamp
          });
        });
        setConnectedMap(playerMap);
      }
      
      // Log the rejoin event
      setLogs(prev => [...prev, { 
        type: 'info', 
        name: 'HOST', 
        time: Date.now(),
        message: 'ゲームセッションに再接続しました'
      }]);
    };

    const handlePlayerListUpdate = (data) => {
      if (data.players && Array.isArray(data.players)) {
        const playerMap = new Map();
        data.players.forEach(player => {
          const playerName = player.name || player.playerName || player;
          const timestamp = player.joinedAt || player.joined_at;
          const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
          playerMap.set(playerName, {
            name: playerName,
            joinedAt: validTimestamp
          });
        });
        setConnectedMap(playerMap);
      }
    };

    // Listen for new players joining the game
    const handlePlayerJoined = ({ player, totalPlayers }) => {
      console.log('🎯 playerJoined event received:', { player, totalPlayers, sessionRestored, hostConnected });
      if (import.meta.env.DEV) {
        console.log('New player joined:', player);
      }
      // Get updated player list from the game
      const joinedAt = Date.now();
      setConnectedMap(prev => {
        const next = new Map(prev);
        // Preserve original join time if we already have it (rejoin edge-case)
        const existing = next.get(player.name);
        next.set(player.name, { name: player.name, joinedAt: existing?.joinedAt ?? joinedAt });
        return next;
      });

      // Add animation for new player
      setPlayerAnimations(prevAnimations => {
        const newAnimations = new Set(prevAnimations);
        newAnimations.add(player.name);
        // Remove animation after animation completes
        setTimeout(() => {
          setPlayerAnimations(current => {
            const next = new Set(current);
            next.delete(player.name);
            return next;
          });
        }, 600);
        return newAnimations;
      });

      // Log the join event
      setLogs(prev => [...prev, { type: 'join', name: player.name, time: Date.now() }]);
    };

    // Listen for player disconnects and log a terminal line
    const handlePlayerDisconnected = ({ playerName, allPlayers }) => {
      if (import.meta.env.DEV) {
        console.log('Player disconnected:', playerName);
      }

      // Update connected map from payload if available; otherwise remove locally
      if (Array.isArray(allPlayers)) {
        setConnectedMap(prev => {
          const next = new Map();
          // Try to preserve join times for still-connected players
          const prevMap = prev;
          for (const p of allPlayers) {
            const prevEntry = prevMap.get(p.name);
            const timestamp = prevEntry?.joinedAt || p.joinedAt || p.joined_at;
            const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp)) ? timestamp : Date.now();
            next.set(p.name, { 
              name: p.name, 
              joinedAt: validTimestamp
            });
          }
          return next;
        });
      } else {
        setConnectedMap(prev => {
          const next = new Map(prev);
          next.delete(playerName);
          return next;
        });
      }

      // Append a leave log entry for the terminal
      setLogs(prev => [...prev, { type: 'left', name: playerName, time: Date.now() }]);
    };

    // Handle event log restoration
    const handleEventLogRestored = ({ events }) => {
      console.log('📜 Event log restored:', events);
      if (events && Array.isArray(events)) {
        // Convert backend events to frontend log format
        const restoredLogs = events.map(event => ({
          type: event.type, // 'join' or 'left'
          name: event.playerName,
          time: event.time,
          isRestored: true // Mark as restored event
        }));
        
        // Set the restored logs, replacing any existing logs
        setLogs(restoredLogs);
        
        console.log(`📜 Restored ${restoredLogs.length} events to terminal`);
      }
    };

    on('host:gameJoined', handleHostGameJoined);
    on('host:playerListUpdate', handlePlayerListUpdate);
    on('host:eventLogRestored', handleEventLogRestored);
    on('playerJoined', handlePlayerJoined);
    on('playerDisconnected', handlePlayerDisconnected);

    return () => {
      off('host:gameJoined', handleHostGameJoined);
      off('host:playerListUpdate', handlePlayerListUpdate);
      off('host:eventLogRestored', handleEventLogRestored);
      off('playerJoined', handlePlayerJoined);
      off('playerDisconnected', handlePlayerDisconnected);
    }
  }, [room, title, navigate, on, off, hostState])

  // Tick for live duration display
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [])

  // Persist session data when state changes
  useEffect(() => {
    if (hostConnected && connectedMap.size > 0) {
      const sessionDataToSave = {
        connectedPlayers: Array.from(connectedMap.entries()),
        logs: logs.slice(-50), // Keep last 50 log entries
        gameState: {
          room,
          title,
          gameId,
          questionSetId
        }
      }
      // The socket manager will handle persistence
      emit('host:saveSession', sessionDataToSave)
    }
  }, [connectedMap, logs, emit, hostConnected, room, title, gameId, questionSetId])

  // Context menu removed (kick/rejoin disabled)

  const handleStart = () => {
    emit('startGame', { gameCode: room });
    // Navigate to new Phase 6 host dashboard instead of old quiz control
    navigate('/host/dashboard', { 
      state: { 
        room, 
        title, 
        gameId,
        questionSetId,
        players: connectedMap.size
      } 
    });
  }

  const handleOpenSettings = () => {
    if (!questionSetId) {
      if (import.meta.env.DEV) {
        console.error('No questionSetId available for settings');
      }
      alert('設定を開けません: 問題セットIDが見つかりません');
      return;
    }
    setShowSettings(true);
  }

  const handleCloseSettings = () => {
    setShowSettings(false);
  }

  // Player name actions removed

  const connectedCount = connectedMap.size
  const disconnectedCount = useMemo(() => logs.filter(l => l.type === 'left').length, [logs])

  const filteredLogs = useMemo(() => {
    const txt = filterText.trim().toLowerCase()
    const arr = txt ? logs.filter(l => l.name.toLowerCase().includes(txt)) : logs.slice()
    arr.sort((a, b) => sortOrder === 'desc' ? b.time - a.time : a.time - b.time)
    return arr
  }, [logs, filterText, sortOrder])

  const formatTime = (t) => new Date(t).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDuration = (ms) => {
    // Handle invalid inputs
    if (typeof ms !== 'number' || isNaN(ms) || ms < 0) {
      return '0s';
    }
    
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}h ${m}m ${ss}s`;
    if (m > 0) return `${m}m ${ss}s`;
    return `${ss}s`;
  }

  const renderLogLine = (entry, index) => {
    const isJoin = entry.type === 'join'
    const isLeft = entry.type === 'left'
  // kick entries removed
    const isError = entry.type === 'error'
    const isInfo = entry.type === 'info'
    const isRestored = entry.isRestored || false
    const classes = [
      'host-terminal-line',
      isJoin ? 'host-terminal-line--join' : '',
      isLeft ? 'host-terminal-line--left' : '',
      isError ? 'host-terminal-line--error' : '',
      isInfo ? 'host-terminal-line--info' : '',
      isRestored ? 'host-terminal-line--restored' : ''
    ].filter(Boolean).join(' ')
    const isCurrentlyConnected = connectedMap.has(entry.name)
    const joinedAt = connectedMap.get(entry.name)?.joinedAt
  return (
      <div key={`${entry.type}-${entry.name}-${entry.time}-${index}`} className={classes}>
        <span className="host-terminal-line__prefix">{isRestored ? '↻' : '$'}</span>
        <span className="host-terminal-line__icon" aria-hidden>
          {isJoin && <FaUserPlus />}
          {isLeft && <FaUserMinus />}
        </span>
        <span className="host-terminal-line__command">
          {isJoin ? 'player_join' : isLeft ? 'player_left' : isInfo ? 'info' : 'system'}
        </span>
        <span className="host-terminal-line__player" title="player">
          {isInfo && entry.message ? entry.message : entry.name}
        </span>
        <span className={`host-terminal-line__status ${isLeft ? 'host-terminal-line__status--left' : ''}`}>
          {isLeft ? '✖ disconnected' : '✔ connected'}
        </span>
        <span className="host-terminal-line__time">{formatTime(entry.time)}</span>
    {isJoin && isCurrentlyConnected && (
          <span className="host-terminal-line__duration" aria-live="polite">
            <FiClock className="host-terminal-line__duration-icon" /> 
            {(() => {
              const timestamp = joinedAt || entry.time || Date.now();
              const duration = nowTick - timestamp;
              return formatDuration(duration);
            })()}
          </span>
        )}
      </div>
    )
  }

  const renderLogsGrouped = () => {
    if (groupBy === 'chrono') {
      return <div className="host-terminal-content">{filteredLogs.map(renderLogLine)}</div>
    }
    if (groupBy === 'status') {
      const joins = filteredLogs.filter(l => l.type === 'join')
  const leaves = filteredLogs.filter(l => l.type === 'left')
      return (
        <div className="host-terminal-content">
          <div className="host-terminal-group">
            <div className="host-terminal-group__title">✔ 接続</div>
            {joins.map(renderLogLine)}
          </div>
          <div className="host-terminal-group">
            <div className="host-terminal-group__title">✖ 切断</div>
            {leaves.map(renderLogLine)}
          </div>
        </div>
      )
    }
    // groupBy === 'player'
    const byPlayer = new Map()
    for (const e of filteredLogs) {
      if (!byPlayer.has(e.name)) byPlayer.set(e.name, [])
      byPlayer.get(e.name).push(e)
    }
    const entries = Array.from(byPlayer.entries()).sort(([a], [b]) => a.localeCompare(b))
    return (
      <div className="host-terminal-content">
        {entries.map(([name, arr]) => (
          <div className="host-terminal-group" key={name}>
            <div className="host-terminal-group__title">
              <FiUser className="host-terminal-group__icon" /> {name}
            </div>
            {arr.map(renderLogLine)}
          </div>
        ))}
      </div>
    )
  }

  const handleExport = () => {
    const header = 'time,name,type\n'
    const lines = logs.map(l => `${new Date(l.time).toISOString()},${l.name},${l.type}`)
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tuiz_lobby_log_${room}_${new Date().toISOString()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="host-lobby-page">
      {/* Connection Status Indicator */}
      <ConnectionStatus 
        position="top-right"
        showText={true}
        className="host-lobby__connection-status"
        autoHide={true}
        autoHideDelay={2000}
        isConnected={hostConnected}
        connectionState={hostConnected ? 'connected' : 'disconnected'}
        reconnectAttempts={0}
      />
      
      <div className="host-lobby-container">
        {/* Header Section with Room Code */}
        <div className="host-lobby-header">
          <div className="host-room-code-card">
            <div className="host-room-code-card__header">
              <h1 className="host-room-code-card__title">
                <GamepadIcon className="host-room-code-card__icon" /> クイズの準備完了！
              </h1>
              <h2 className="host-room-code-card__subtitle">{title}</h2>
              
            </div>
            <div className="host-room-code-card__content">
              <div className="host-room-code-display">
                <div className="host-room-code-display__label">ルームコード</div>
                <div className="host-room-code-display__code">{room}</div>
                <div className="host-room-code-display__hint">
                  プレイヤーにこのコードを伝えてください
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="host-lobby-content">
          {/* Players Panel */}
          <div className="host-players-panel">
            <div className="host-players-card">
              <div className="host-players-card__header">
                <div className="host-players-card__title-section">
                  <h3 className="host-players-card__title">
                    <FiUsers className="host-players-card__icon" /> 接続中のプレイヤー
                  </h3>
                  <div className="host-player-count-badge">
                    <span className="host-player-count-badge__number">{connectedCount}</span>
                    <span className="host-player-count-badge__text">人参加中</span>
                  </div>
                </div>
                <button 
                  className="host-button host-button--small host-button--outline" 
                  onClick={handleOpenSettings}
                  title="ゲーム設定"
                >
                  <FiSettings className="host-button__icon" /> 設定
                </button>
              </div>

              <div className="host-players-card__content">
                <div className="host-terminal-window">
                  <div className="host-terminal-window__header">
                    <div className="host-terminal-window__controls">
                      <span className="host-terminal-window__control host-terminal-window__control--close"></span>
                      <span className="host-terminal-window__control host-terminal-window__control--minimize"></span>
                      <span className="host-terminal-window__control host-terminal-window__control--maximize"></span>
                    </div>
                    <div className="host-terminal-window__title">TUIZ_LOBBY.exe</div>
                  </div>
                  <div className="host-terminal-toolbar">
                    <div className="host-status-badges">
                      <span className="host-status-badge host-status-badge--connected">✔ 接続中: {connectedCount}</span>
                      <span className="host-status-badge host-status-badge--disconnected">✖ 切断: {disconnectedCount}</span>
                    </div>
                    <div className="host-terminal-controls">
                      <div className="host-filter">
                        <FaSearch className="host-filter__icon" />
                        <input
                          className="host-filter__input"
                          placeholder="プレイヤー検索..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          aria-label="プレイヤー検索"
                        />
                      </div>
                      <div className="host-group-sort">
                        <div className="host-select">
                          <span className="host-select__label">表示</span>
                          <CustomDropdown
                            value={groupBy}
                            onChange={setGroupBy}
                            options={[
                              { value: 'chrono', label: '時系列' },
                              { value: 'status', label: '状態' },
                              { value: 'player', label: 'プレイヤー' }
                            ]}
                            placeholder="表示"
                            icon={FaChevronDown}
                            className="host-select__dropdown"
                          />
                        </div>
                        <div className="host-select">
                          <span className="host-select__label">ソート</span>
                          <CustomDropdown
                            value={sortOrder}
                            onChange={setSortOrder}
                            options={[
                              { value: 'desc', label: '新→旧' },
                              { value: 'asc', label: '旧→新' }
                            ]}
                            placeholder="ソート"
                            icon={FaChevronDown}
                            className="host-select__dropdown"
                          />
                        </div>
                        <button className="host-button host-button--small" onClick={handleExport} title="ログをエクスポート">
                          <FaDownload className="host-button__icon" /> エクスポート
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="host-terminal-window__content" role="log" aria-live="polite">
                    {logs.length === 0 && connectedCount === 0 ? (
                      <div className="host-terminal-empty">
                        <div className="host-terminal-empty__icon">
                          <FiClock className="host-terminal-empty__clock" />
                        </div>
                        <div className="host-terminal-empty__text">プレイヤーの参加を待っています...</div>
                        <div className="host-terminal-empty__hint">
                          ルームコード <strong>{room}</strong> を共有してください
                        </div>
                      </div>
                    ) : (
                      renderLogsGrouped()
                    )}
                  </div>
                </div>
              </div>

              <div className="host-players-card__footer">
                <div className="host-lobby-actions">
                  <button 
                    className="host-button host-button--large host-button--primary"
                    onClick={handleStart}
                    disabled={connectedCount === 0}
                  >
                    {connectedCount === 0 ? (
                      <>
                        <FiClock className="host-button__icon" /> プレイヤーを待機中
                      </>
                    ) : (
                      <><FaRocket className="host-button__icon" /> クイズを開始する ({connectedCount}人)</>
                    )}
                  </button>
                  
                  {connectedCount > 0 && (
                    <div className="host-lobby-actions__hint">
                      <FiInfo className="host-lobby-actions__hint-icon" /> 参加者が全員揃ったらクイズを開始しましょう
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Host Tips Panel */}
          <div className="host-tips-panel">
            {/* Live Player List Sidebar */}
            <div className="host-live-card">
              <div className="host-live-card__header">
                <h3 className="host-live-card__title">
                  <span className="host-live-card__status-indicator"></span> 現在接続中
                </h3>
              </div>
              <ul className="host-live-card__list">
                {Array.from(connectedMap.values()).map(({ name, joinedAt }) => (
                  <li key={`live-${name}`} className="host-live-card__item">
                    <span className="host-live-card__name">{name}</span>
                    <span className="host-live-card__duration">
                      <FiClock className="host-live-card__duration-icon" /> 
                      {(() => {
                        const timestamp = joinedAt || Date.now();
                        const duration = nowTick - timestamp;
                        return formatDuration(duration);
                      })()}
                    </span>
                  </li>
                ))}
                {connectedCount === 0 && (
                  <li className="host-live-card__item host-live-card__item--empty">（接続中のプレイヤーはいません）</li>
                )}
              </ul>
            </div>

            <div className="host-tips-card">
              <div className="host-tips-card__header">
                <h3 className="host-tips-card__title">
                  <FiInfo className="host-tips-card__icon" /> ホストのヒント
                </h3>
              </div>
              <div className="host-tips-card__content">
                <div className="host-tip">
                  <div className="host-tip__icon">
                    <FiTarget className="host-tip__icon-svg" />
                  </div>
                  <div className="host-tip__content">
                    <strong>プレイヤー参加</strong>
                    <p>ルームコード <span className="host-tip__code">{room}</span> を共有してプレイヤーを招待</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">
                    <FiSettings className="host-tip__icon-svg" />
                  </div>
                  <div className="host-tip__content">
                    <strong>ゲーム設定</strong>
                    <p>設定ボタンから制限時間や得点システムをカスタマイズ</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">
                    <FiAward className="host-tip__icon-svg" />
                  </div>
                  <div className="host-tip__content">
                    <strong>ベストな人数</strong>
                    <p>2-20人程度がおすすめ。参加者が揃ったら開始しましょう</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">
                    <FiSmartphone className="host-tip__icon-svg" />
                  </div>
                  <div className="host-tip__content">
                    <strong>クロスプラットフォーム</strong>
                    <p>PC・スマホ・タブレットから誰でも参加可能</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Info Panel */}
            <div className="host-game-info-card">
              <div className="host-game-info-card__header">
                <h3 className="host-game-info-card__title">
                  <FiBarChart className="host-game-info-card__icon" /> ゲーム情報
                </h3>
              </div>
              <div className="host-game-info-card__content">
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">
                    <GamepadIcon className="host-game-info__stat-icon-svg" />
                  </div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">ゲームID</span>
                    <span className="host-game-info__stat-value">{gameId || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">
                    <FiBook className="host-game-info__stat-icon-svg" />
                  </div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">問題セット</span>
                    <span className="host-game-info__stat-value">{questionSetId || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">
                    <FiClock className="host-game-info__stat-icon-svg" />
                  </div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">待機時間</span>
                    <span className="host-game-info__stat-value">
                      {(() => {
                        const startTime = new Date();
                        return startTime.toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      })()}〜
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel Modal */}
      {showSettings && questionSetId && (
        <div className="host-settings-overlay">
          <GameSettingsPanel 
            questionSetId={questionSetId}
            gameId={gameId}
            onClose={handleCloseSettings}
          />
        </div>
      )}

  {/* Context menu removed */}
    </div>
  )
}

export default HostLobby;
