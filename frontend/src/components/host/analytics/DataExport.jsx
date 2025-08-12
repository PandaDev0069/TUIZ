/* DataExport.jsx - Advanced Data Export System */
/* Phase 3: Advanced Analytics & Reporting */

import React, { useState, useEffect } from 'react';
import { 
  FaDownload, FaFileExport, FaFileCsv, FaFilePdf,
  FaFileExcel, FaFileCode, FaCog, FaCalendarAlt,
  FaFilter, FaDatabase, FaCheck, FaTimes,
  FaSpinner, FaCloudDownload, FaArchive,
  FaTable, FaChartBar, FaUsers, FaQuestionCircle,
  FaHistory, FaSchedule, FaSync, FaTrash
} from 'react-icons/fa';
import PropTypes from 'prop-types';
import './DataExport.css';

const DataExport = ({
  gameData = [],
  playerData = [],
  questionData = [],
  analyticsData = {},
  onExport,
  onScheduleExport
}) => {
  const [exportConfig, setExportConfig] = useState({
    dataTypes: {
      games: true,
      players: true,
      questions: false,
      analytics: false
    },
    format: 'csv',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    filters: {
      gameStatus: 'all',
      includeDeleted: false,
      anonymizeData: false,
      includeMetadata: true
    },
    fields: {
      games: {
        basic: ['id', 'name', 'status', 'createdAt', 'playerCount'],
        detailed: ['settings', 'questions', 'duration', 'results'],
        all: true
      },
      players: {
        basic: ['id', 'name', 'score', 'joinTime'],
        detailed: ['answers', 'sessionTime', 'deviceInfo'],
        all: true
      }
    }
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);
  const [scheduledExports, setScheduledExports] = useState([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'weekly',
    dayOfWeek: 1,
    time: '09:00',
    format: 'csv',
    email: '',
    autoCleanup: true
  });

  // Export format configurations
  const exportFormats = {
    csv: {
      name: 'CSV',
      icon: <FaFileCsv />,
      description: 'Comma-separated values, compatible with Excel and other tools',
      supports: ['games', 'players', 'questions', 'analytics']
    },
    excel: {
      name: 'Excel',
      icon: <FaFileExcel />,
      description: 'Microsoft Excel format with multiple sheets',
      supports: ['games', 'players', 'questions', 'analytics']
    },
    json: {
      name: 'JSON',
      icon: <FaFileCode />,
      description: 'JavaScript Object Notation, ideal for developers',
      supports: ['games', 'players', 'questions', 'analytics']
    },
    pdf: {
      name: 'PDF',
      icon: <FaFilePdf />,
      description: 'Formatted report document',
      supports: ['analytics']
    }
  };

  useEffect(() => {
    loadExportHistory();
    loadScheduledExports();
  }, []);

  const loadExportHistory = () => {
    const history = localStorage.getItem('tuiz_export_history');
    if (history) {
      setExportHistory(JSON.parse(history));
    }
  };

  const loadScheduledExports = () => {
    const scheduled = localStorage.getItem('tuiz_scheduled_exports');
    if (scheduled) {
      setScheduledExports(JSON.parse(scheduled));
    }
  };

  const updateExportConfig = (section, key, value) => {
    setExportConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateFieldSelection = (dataType, fieldGroup, value) => {
    setExportConfig(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [dataType]: {
          ...prev.fields[dataType],
          [fieldGroup]: value
        }
      }
    }));
  };

  const getFilteredData = () => {
    const startDate = new Date(exportConfig.dateRange.start);
    const endDate = new Date(exportConfig.dateRange.end);

    const filteredGames = gameData.filter(game => {
      const gameDate = new Date(game.createdAt || game.startTime);
      if (gameDate < startDate || gameDate > endDate) return false;
      if (exportConfig.filters.gameStatus !== 'all' && game.status !== exportConfig.filters.gameStatus) return false;
      if (!exportConfig.filters.includeDeleted && game.deleted) return false;
      return true;
    });

    const gameIds = filteredGames.map(g => g.id);
    const filteredPlayers = playerData.filter(player => 
      gameIds.includes(player.gameId) && 
      (!player.deleted || exportConfig.filters.includeDeleted)
    );

    const filteredQuestions = questionData.filter(question => 
      !question.deleted || exportConfig.filters.includeDeleted
    );

    return {
      games: filteredGames,
      players: filteredPlayers,
      questions: filteredQuestions,
      analytics: analyticsData
    };
  };

  const processDataForExport = (data, dataType) => {
    const fields = exportConfig.fields[dataType];
    if (!fields || fields.all) return data;

    const selectedFields = [];
    if (fields.basic) selectedFields.push(...exportFormats[exportConfig.format].basic || []);
    if (fields.detailed) selectedFields.push(...exportFormats[exportConfig.format].detailed || []);

    return data.map(item => {
      const processed = {};
      selectedFields.forEach(field => {
        if (item[field] !== undefined) {
          processed[field] = exportConfig.filters.anonymizeData && field === 'name' 
            ? `User_${item.id?.slice(-6) || Math.random().toString(36).slice(-6)}`
            : item[field];
        }
      });
      return processed;
    });
  };

  const estimateExportSize = () => {
    const data = getFilteredData();
    let estimatedSize = 0;

    Object.entries(exportConfig.dataTypes).forEach(([type, enabled]) => {
      if (enabled && data[type]) {
        const itemCount = Array.isArray(data[type]) ? data[type].length : 1;
        const avgItemSize = type === 'analytics' ? 5000 : 500; // bytes
        estimatedSize += itemCount * avgItemSize;
      }
    });

    return estimatedSize;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const exportData = async () => {
    setIsExporting(true);
    try {
      const filteredData = getFilteredData();
      const exportPayload = {};

      // Process each data type
      Object.entries(exportConfig.dataTypes).forEach(([type, enabled]) => {
        if (enabled && filteredData[type]) {
          if (Array.isArray(filteredData[type])) {
            exportPayload[type] = processDataForExport(filteredData[type], type);
          } else {
            exportPayload[type] = filteredData[type];
          }
        }
      });

      // Add metadata if requested
      if (exportConfig.filters.includeMetadata) {
        exportPayload.metadata = {
          exportedAt: new Date().toISOString(),
          format: exportConfig.format,
          dateRange: exportConfig.dateRange,
          filters: exportConfig.filters,
          totalRecords: {
            games: exportPayload.games?.length || 0,
            players: exportPayload.players?.length || 0,
            questions: exportPayload.questions?.length || 0
          }
        };
      }

      // Create export record
      const exportRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        format: exportConfig.format,
        dataTypes: Object.entries(exportConfig.dataTypes)
          .filter(([, enabled]) => enabled)
          .map(([type]) => type),
        recordCount: Object.values(exportPayload).reduce((sum, data) => 
          sum + (Array.isArray(data) ? data.length : 1), 0
        ),
        fileSize: estimateExportSize(),
        status: 'completed'
      };

      // Save to history
      const updatedHistory = [exportRecord, ...exportHistory].slice(0, 20);
      setExportHistory(updatedHistory);
      localStorage.setItem('tuiz_export_history', JSON.stringify(updatedHistory));

      // Call export handler
      await onExport?.(exportPayload, exportConfig.format, exportRecord);

    } catch (error) {
      console.error('Export failed:', error);
      // Add error record to history
      const errorRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        format: exportConfig.format,
        status: 'failed',
        error: error.message
      };
      
      const updatedHistory = [errorRecord, ...exportHistory].slice(0, 20);
      setExportHistory(updatedHistory);
      localStorage.setItem('tuiz_export_history', JSON.stringify(updatedHistory));
    } finally {
      setIsExporting(false);
    }
  };

  const scheduleExport = () => {
    const newSchedule = {
      id: Date.now().toString(),
      ...scheduleConfig,
      createdAt: new Date().toISOString(),
      nextRun: calculateNextRun(scheduleConfig),
      status: 'active'
    };

    const updatedSchedules = [...scheduledExports, newSchedule];
    setScheduledExports(updatedSchedules);
    localStorage.setItem('tuiz_scheduled_exports', JSON.stringify(updatedSchedules));
    
    setShowScheduleDialog(false);
    onScheduleExport?.(newSchedule);
  };

  const calculateNextRun = (config) => {
    const now = new Date();
    const [hours, minutes] = config.time.split(':').map(Number);
    
    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    if (config.frequency === 'daily') {
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    } else if (config.frequency === 'weekly') {
      const daysUntilTarget = (config.dayOfWeek - nextRun.getDay() + 7) % 7;
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
    }
    
    return nextRun.toISOString();
  };

  const deleteScheduledExport = (scheduleId) => {
    const updatedSchedules = scheduledExports.filter(s => s.id !== scheduleId);
    setScheduledExports(updatedSchedules);
    localStorage.setItem('tuiz_scheduled_exports', JSON.stringify(updatedSchedules));
  };

  const isExportEnabled = () => {
    return Object.values(exportConfig.dataTypes).some(enabled => enabled) && 
           exportFormats[exportConfig.format] && 
           !isExporting;
  };

  return (
    <div className="data-export">
      <div className="export-header">
        <h2>
          <FaDownload className="export-icon" />
          Data Export System
        </h2>
        <p>Export your quiz data in various formats for analysis and backup</p>
      </div>

      <div className="export-content">
        {/* Configuration Panel */}
        <div className="export-config">
          {/* Data Types Selection */}
          <div className="config-section">
            <h3>
              <FaDatabase className="section-icon" />
              Data Types
            </h3>
            <div className="data-type-grid">
              {Object.entries(exportConfig.dataTypes).map(([type, enabled]) => (
                <label key={type} className="data-type-checkbox">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => updateExportConfig('dataTypes', type, e.target.checked)}
                  />
                  <div className="checkbox-content">
                    <div className="checkbox-icon">
                      {type === 'games' && <FaTrophy />}
                      {type === 'players' && <FaUsers />}
                      {type === 'questions' && <FaQuestionCircle />}
                      {type === 'analytics' && <FaChartBar />}
                    </div>
                    <span className="checkbox-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="config-section">
            <h3>
              <FaFileExport className="section-icon" />
              Export Format
            </h3>
            <div className="format-grid">
              {Object.entries(exportFormats).map(([format, config]) => (
                <div
                  key={format}
                  className={`format-card ${exportConfig.format === format ? 'format-card--selected' : ''}`}
                  onClick={() => updateExportConfig('format', 'format', format)}
                >
                  <div className="format-icon">{config.icon}</div>
                  <div className="format-info">
                    <h4>{config.name}</h4>
                    <p>{config.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="config-section">
            <h3>
              <FaCalendarAlt className="section-icon" />
              Date Range
            </h3>
            <div className="date-range">
              <div className="date-input">
                <label>Start Date</label>
                <input
                  type="date"
                  value={exportConfig.dateRange.start}
                  onChange={(e) => updateExportConfig('dateRange', 'start', e.target.value)}
                />
              </div>
              <div className="date-input">
                <label>End Date</label>
                <input
                  type="date"
                  value={exportConfig.dateRange.end}
                  onChange={(e) => updateExportConfig('dateRange', 'end', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="config-section">
            <h3>
              <FaFilter className="section-icon" />
              Filters & Options
            </h3>
            <div className="filters-grid">
              <div className="filter-item">
                <label>Game Status</label>
                <select
                  value={exportConfig.filters.gameStatus}
                  onChange={(e) => updateExportConfig('filters', 'gameStatus', e.target.value)}
                >
                  <option value="all">All Games</option>
                  <option value="completed">Completed Only</option>
                  <option value="active">Active Only</option>
                </select>
              </div>
              
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={exportConfig.filters.includeDeleted}
                  onChange={(e) => updateExportConfig('filters', 'includeDeleted', e.target.checked)}
                />
                Include Deleted Records
              </label>
              
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={exportConfig.filters.anonymizeData}
                  onChange={(e) => updateExportConfig('filters', 'anonymizeData', e.target.checked)}
                />
                Anonymize Player Data
              </label>
              
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={exportConfig.filters.includeMetadata}
                  onChange={(e) => updateExportConfig('filters', 'includeMetadata', e.target.checked)}
                />
                Include Export Metadata
              </label>
            </div>
          </div>

          {/* Export Summary */}
          <div className="config-section">
            <h3>Export Summary</h3>
            <div className="export-summary">
              <div className="summary-item">
                <span>Estimated Records:</span>
                <span>{getFilteredData().games.length + getFilteredData().players.length}</span>
              </div>
              <div className="summary-item">
                <span>Estimated Size:</span>
                <span>{formatFileSize(estimateExportSize())}</span>
              </div>
              <div className="summary-item">
                <span>Format:</span>
                <span>{exportFormats[exportConfig.format].name}</span>
              </div>
            </div>
          </div>

          {/* Export Actions */}
          <div className="export-actions">
            <button
              className="export-btn export-btn--primary"
              onClick={exportData}
              disabled={!isExportEnabled()}
            >
              {isExporting ? (
                <>
                  <FaSpinner className="spinning" />
                  Exporting...
                </>
              ) : (
                <>
                  <FaCloudDownload />
                  Export Now
                </>
              )}
            </button>
            
            <button
              className="export-btn export-btn--secondary"
              onClick={() => setShowScheduleDialog(true)}
            >
              <FaSchedule />
              Schedule Export
            </button>
          </div>
        </div>

        {/* History & Scheduled Exports */}
        <div className="export-history">
          {/* Export History */}
          <div className="history-section">
            <h3>
              <FaHistory className="section-icon" />
              Export History
            </h3>
            <div className="history-list">
              {exportHistory.length === 0 ? (
                <div className="empty-history">
                  <FaArchive className="empty-icon" />
                  <p>No exports yet</p>
                </div>
              ) : (
                exportHistory.map((record) => (
                  <div key={record.id} className="history-item">
                    <div className="history-main">
                      <div className="history-info">
                        <span className="history-format">{record.format?.toUpperCase()}</span>
                        <span className="history-date">
                          {new Date(record.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className={`history-status history-status--${record.status}`}>
                        {record.status === 'completed' && <FaCheck />}
                        {record.status === 'failed' && <FaTimes />}
                        {record.status === 'processing' && <FaSpinner className="spinning" />}
                        {record.status}
                      </div>
                    </div>
                    <div className="history-details">
                      {record.dataTypes && (
                        <span>Types: {record.dataTypes.join(', ')}</span>
                      )}
                      {record.recordCount && (
                        <span>Records: {record.recordCount}</span>
                      )}
                      {record.fileSize && (
                        <span>Size: {formatFileSize(record.fileSize)}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Scheduled Exports */}
          <div className="scheduled-section">
            <h3>
              <FaSync className="section-icon" />
              Scheduled Exports
            </h3>
            <div className="scheduled-list">
              {scheduledExports.length === 0 ? (
                <div className="empty-scheduled">
                  <FaSchedule className="empty-icon" />
                  <p>No scheduled exports</p>
                </div>
              ) : (
                scheduledExports.map((schedule) => (
                  <div key={schedule.id} className="scheduled-item">
                    <div className="scheduled-main">
                      <div className="scheduled-info">
                        <span className="scheduled-frequency">{schedule.frequency}</span>
                        <span className="scheduled-format">{schedule.format.toUpperCase()}</span>
                      </div>
                      <div className="scheduled-actions">
                        <button
                          className="scheduled-action-btn"
                          onClick={() => deleteScheduledExport(schedule.id)}
                          title="Delete Schedule"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="scheduled-details">
                      <span>Next run: {new Date(schedule.nextRun).toLocaleString()}</span>
                      {schedule.email && <span>Email: {schedule.email}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Dialog */}
      {showScheduleDialog && (
        <div className="modal-overlay">
          <div className="schedule-dialog">
            <div className="schedule-dialog__header">
              <h3>Schedule Export</h3>
              <button
                className="close-btn"
                onClick={() => setShowScheduleDialog(false)}
              >
                ×
              </button>
            </div>
            <div className="schedule-dialog__content">
              <div className="schedule-form">
                <div className="form-group">
                  <label>Frequency</label>
                  <select
                    value={scheduleConfig.frequency}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, frequency: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                
                {scheduleConfig.frequency === 'weekly' && (
                  <div className="form-group">
                    <label>Day of Week</label>
                    <select
                      value={scheduleConfig.dayOfWeek}
                      onChange={(e) => setScheduleConfig(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  </div>
                )}
                
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={scheduleConfig.time}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
                
                <div className="form-group">
                  <label>Format</label>
                  <select
                    value={scheduleConfig.format}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, format: e.target.value }))}
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Email (optional)</label>
                  <input
                    type="email"
                    value={scheduleConfig.email}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Send export to email..."
                  />
                </div>
                
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={scheduleConfig.autoCleanup}
                    onChange={(e) => setScheduleConfig(prev => ({ ...prev, autoCleanup: e.target.checked }))}
                  />
                  Auto-cleanup old exports
                </label>
              </div>
            </div>
            <div className="schedule-dialog__actions">
              <button
                className="export-btn export-btn--secondary"
                onClick={() => setShowScheduleDialog(false)}
              >
                Cancel
              </button>
              <button
                className="export-btn export-btn--primary"
                onClick={scheduleExport}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DataExport.propTypes = {
  gameData: PropTypes.array,
  playerData: PropTypes.array,
  questionData: PropTypes.array,
  analyticsData: PropTypes.object,
  onExport: PropTypes.func,
  onScheduleExport: PropTypes.func
};

export default DataExport;
