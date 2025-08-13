import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import socket from '../socket'
import GameSettingsPanel from '../components/GameSettingsPanel'
import { FaRocket, FaUserPlus, FaUserMinus, FaSearch, FaChevronDown, FaDownload } from 'react-icons/fa'
import './hostLobby.css'

function HostLobby() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { room, title, gameId, questionSetId } = state || {}
  // Map of currently connected players: name -> joinedAt (ms)
  const [connectedMap, setConnectedMap] = useState(new Map())
  const [showSettings, setShowSettings] = useState(false)
  const [playerAnimations, setPlayerAnimations] = useState(new Set())
  // Unified event log: { type: 'join' | 'left' | 'kick' | 'error', name: string, time: number }
  const [logs, setLogs] = useState([])
  const [filterText, setFilterText] = useState('')
  const [groupBy, setGroupBy] = useState('chrono') // 'chrono' | 'status' | 'player'
  const [sortOrder, setSortOrder] = useState('desc') // 'desc' | 'asc'
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, name: null, connected: false })
  const [nowTick, setNowTick] = useState(Date.now())
  const menuRef = useRef(null)
  // Kick/Allow rejoin logic
  const [kickedSet, setKickedSet] = useState(new Set())
  const autoKickCooldownRef = useRef(new Map()) // name -> last auto kick timestamp

  // Debug logging - only in development
  if (import.meta.env.DEV) {
    console.log('HostLobby state:', state);
    console.log('HostLobby questionSetId:', questionSetId);
  }

  useEffect(() => {
    if (!room || !title) {
      navigate('/dashboard')
      return
    }

  // Listen for new players joining the game
    socket.on('playerJoined', ({ player, totalPlayers }) => {
      if (import.meta.env.DEV) {
        console.log('New player joined:', player);
      }
      // If player is in kicked list, auto-kick (block rejoin) unless host allowed via Reconnect
      if (kickedSet.has(player.name)) {
        const now = Date.now();
        const last = autoKickCooldownRef.current.get(player.name) || 0;
        if (now - last > 3000) { // throttle auto-kicks to every 3s
          autoKickCooldownRef.current.set(player.name, now);
          try { socket.emit('kickPlayer', { gameCode: room, playerName: player.name }); } catch {}
          setLogs(prev => [...prev, { type: 'kick', name: player.name, time: now }]);
        }
        return; // don't register as connected
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
    });

    // Listen for player disconnects and log a terminal line
    socket.on('playerDisconnected', ({ playerName, allPlayers }) => {
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
            next.set(p.name, { name: p.name, joinedAt: prevEntry?.joinedAt ?? Date.now() });
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
    });

    return () => {
  socket.off('playerJoined');
  socket.off('playerDisconnected');
    }
  }, [room, title, navigate])

  // Tick for live duration display
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [])

  // Close context menu on outside click or escape
  useEffect(() => {
    function handleDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu(m => ({ ...m, open: false }));
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') setMenu(m => ({ ...m, open: false }));
    }
    if (menu.open) {
      document.addEventListener('mousedown', handleDocClick);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menu.open])

  const handleStart = () => {
    socket.emit('startGame', { gameCode: room });
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

  const handlePlayerNameClick = (e, name) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({
      open: true,
      x: rect.left,
      y: rect.bottom + window.scrollY,
      name,
      connected: connectedMap.has(name)
    });
  }

  const emitKick = (name) => {
    try {
      socket.emit('kickPlayer', { gameCode: room, playerName: name });
      setLogs(prev => [...prev, { type: 'kick', name, time: Date.now() }]);
  setKickedSet(prev => new Set(prev).add(name));
    } catch (err) {
      console.warn('kickPlayer unsupported:', err);
      setLogs(prev => [...prev, { type: 'error', name, time: Date.now() }]);
    } finally {
      setMenu(m => ({ ...m, open: false }));
    }
  }

  const emitReconnect = (name) => {
    try {
      socket.emit('requestReconnect', { gameCode: room, playerName: name });
      setLogs(prev => [...prev, { type: 'info', name, time: Date.now() }]);
      setKickedSet(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    } catch (err) {
      console.warn('requestReconnect unsupported:', err);
    } finally {
      setMenu(m => ({ ...m, open: false }));
    }
  }

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
    const isKick = entry.type === 'kick'
    const isError = entry.type === 'error'
    const isInfo = entry.type === 'info'
    const classes = [
      'host-terminal-line',
      isJoin ? 'host-terminal-line--join' : '',
      isLeft ? 'host-terminal-line--left' : '',
      isKick ? 'host-terminal-line--kick' : '',
      isError ? 'host-terminal-line--error' : '',
      isInfo ? 'host-terminal-line--info' : ''
    ].filter(Boolean).join(' ')
    const isCurrentlyConnected = connectedMap.has(entry.name)
    const joinedAt = connectedMap.get(entry.name)?.joinedAt
  return (
      <div key={`${entry.type}-${entry.name}-${entry.time}-${index}`} className={classes}>
        <span className="host-terminal-line__prefix">$</span>
        <span className="host-terminal-line__icon" aria-hidden>
          {isJoin && <FaUserPlus />}
          {isLeft && <FaUserMinus />}
          {isKick && <FaUserMinus />}
        </span>
        <span className="host-terminal-line__command">
          {isJoin ? 'player_join' : isLeft ? 'player_left' : isKick ? 'player_kick' : 'info'}
        </span>
        <button
          className="host-terminal-line__player"
          onClick={(e) => handlePlayerNameClick(e, entry.name)}
          title="アクション"
        >
          {entry.name}
        </button>
        <span className={`host-terminal-line__status ${isLeft || isKick ? 'host-terminal-line__status--left' : ''}`}>
          {isLeft || isKick ? '✖ disconnected' : '✔ connected'}
        </span>
        <span className="host-terminal-line__time">{formatTime(entry.time)}</span>
    {isJoin && isCurrentlyConnected && (
          <span className="host-terminal-line__duration" aria-live="polite">
            ⏱ {formatDuration(nowTick - (joinedAt ?? entry.time))}
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
      const leaves = filteredLogs.filter(l => l.type === 'left' || l.type === 'kick')
      return (
        <div className="host-terminal-content">
          <div className="host-terminal-group">
            <div className="host-terminal-group__title">✔ 接続</div>
            {joins.map(renderLogLine)}
          </div>
          <div className="host-terminal-group">
            <div className="host-terminal-group__title">✖ 切断/キック</div>
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
            <div className="host-terminal-group__title">👤 {name}</div>
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
      <div className="host-lobby-container">
        {/* Header Section with Room Code */}
        <div className="host-lobby-header">
          <div className="host-room-code-card">
            <div className="host-room-code-card__header">
              <h1 className="host-room-code-card__title">🎮 クイズの準備完了！</h1>
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
                  <h3 className="host-players-card__title">👥 接続中のプレイヤー</h3>
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
                  ⚙️ 設定
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
                        <label className="host-select">
                          <span className="host-select__label">表示</span>
                          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} aria-label="表示">
                            <option value="chrono">時系列</option>
                            <option value="status">状態</option>
                            <option value="player">プレイヤー</option>
                          </select>
                          <FaChevronDown aria-hidden className="host-select__icon" />
                        </label>
                        <label className="host-select">
                          <span className="host-select__label">ソート</span>
                          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="ソート">
                            <option value="desc">新→旧</option>
                            <option value="asc">旧→新</option>
                          </select>
                          <FaChevronDown aria-hidden className="host-select__icon" />
                        </label>
                        <button className="host-button host-button--small" onClick={handleExport} title="ログをエクスポート">
                          <FaDownload className="host-button__icon" /> エクスポート
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="host-terminal-window__content" role="log" aria-live="polite">
                    {logs.length === 0 && connectedCount === 0 ? (
                      <div className="host-terminal-empty">
                        <div className="host-terminal-empty__icon">⏳</div>
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
                      <>⏳ プレイヤーを待機中</>
                    ) : (
                      <><FaRocket className="host-button__icon" /> クイズを開始する ({connectedCount}人)</>
                    )}
                  </button>
                  
                  {connectedCount > 0 && (
                    <div className="host-lobby-actions__hint">
                      💡 参加者が全員揃ったらクイズを開始しましょう
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
                <h3 className="host-live-card__title">🟢 現在接続中</h3>
              </div>
              <ul className="host-live-card__list">
                {Array.from(connectedMap.values()).map(({ name, joinedAt }) => (
                  <li key={`live-${name}`} className="host-live-card__item">
                    <button className="host-live-card__name" onClick={(e) => handlePlayerNameClick(e, name)}>{name}</button>
                    <span className="host-live-card__duration">⏱ {formatDuration(nowTick - joinedAt)}</span>
                  </li>
                ))}
                {connectedCount === 0 && (
                  <li className="host-live-card__item host-live-card__item--empty">（接続中のプレイヤーはいません）</li>
                )}
              </ul>
            </div>

            <div className="host-tips-card">
              <div className="host-tips-card__header">
                <h3 className="host-tips-card__title">💡 ホストのヒント</h3>
              </div>
              <div className="host-tips-card__content">
                <div className="host-tip">
                  <div className="host-tip__icon">🎯</div>
                  <div className="host-tip__content">
                    <strong>プレイヤー参加</strong>
                    <p>ルームコード <span className="host-tip__code">{room}</span> を共有してプレイヤーを招待</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">⚙️</div>
                  <div className="host-tip__content">
                    <strong>ゲーム設定</strong>
                    <p>設定ボタンから制限時間や得点システムをカスタマイズ</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">🏆</div>
                  <div className="host-tip__content">
                    <strong>ベストな人数</strong>
                    <p>2-20人程度がおすすめ。参加者が揃ったら開始しましょう</p>
                  </div>
                </div>
                
                <div className="host-tip">
                  <div className="host-tip__icon">📱</div>
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
                <h3 className="host-game-info-card__title">📊 ゲーム情報</h3>
              </div>
              <div className="host-game-info-card__content">
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">🎮</div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">ゲームID</span>
                    <span className="host-game-info__stat-value">{gameId || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">📚</div>
                  <div className="host-game-info__stat-content">
                    <span className="host-game-info__stat-label">問題セット</span>
                    <span className="host-game-info__stat-value">{questionSetId || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="host-game-info__stat">
                  <div className="host-game-info__stat-icon">⏱️</div>
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

      {/* Context Menu */}
      {menu.open && (
        <div
          ref={menuRef}
          className="host-context-menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <button className="host-context-menu__item" role="menuitem" onClick={() => emitKick(menu.name)}>👢 キック</button>
          <button className="host-context-menu__item" role="menuitem" onClick={() => emitReconnect(menu.name)}>🔁 再接続リクエスト</button>
        </div>
      )}
    </div>
  )
}

export default HostLobby;
