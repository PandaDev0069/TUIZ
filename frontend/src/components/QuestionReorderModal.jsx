import { useState, useEffect } from 'react';
import './questionReorderModal.css';

function QuestionReorderModal({ questions, onReorder, onClose, isOpen }) {
  const [localQuestions, setLocalQuestions] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (questions) {
      setLocalQuestions([...questions]);
    }
  }, [questions]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add dragging class
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...localQuestions];
    const draggedQuestion = newQuestions[draggedIndex];
    
    // Remove from old position
    newQuestions.splice(draggedIndex, 1);
    
    // Insert at new position
    newQuestions.splice(dropIndex, 0, draggedQuestion);
    
    setLocalQuestions(newQuestions);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveQuestion = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= localQuestions.length) return;
    
    const newQuestions = [...localQuestions];
    const question = newQuestions[fromIndex];
    newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, question);
    setLocalQuestions(newQuestions);
  };

  const moveUp = (index) => {
    moveQuestion(index, index - 1);
  };

  const moveDown = (index) => {
    moveQuestion(index, index + 1);
  };

  const reverseOrder = () => {
    setLocalQuestions([...localQuestions].reverse());
  };

  const shuffleQuestions = () => {
    const shuffled = [...localQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setLocalQuestions(shuffled);
  };

  const handleSave = () => {
    console.log('Save button clicked, reordered questions:', localQuestions);
    if (onReorder) {
      onReorder(localQuestions);
    } else {
      console.error('onReorder function not provided');
    }
    if (onClose) {
      onClose();
    } else {
      console.error('onClose function not provided');
    }
  };

  const handleCancel = () => {
    setLocalQuestions([...questions]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div className="reorder-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-left">
            <h2 className="modal-title">問題の順序を変更</h2>
            <p className="modal-description">
              ドラッグ&ドロップまたはボタンで問題の順序を変更できます
            </p>
          </div>
          <button className="close-button" onClick={handleCancel}>
            ✕
          </button>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="action-btn" onClick={reverseOrder}>
            🔄 順序を反転
          </button>
          <button className="action-btn secondary" onClick={shuffleQuestions}>
            🎲 ランダムに並び替え
          </button>
        </div>

        {/* Questions Container */}
        <div className="questions-container">
          <div className="questions-list">
            {localQuestions.map((question, index) => (
              <div
                key={question.id}
                className={`question-reorder-item ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Drag Handle */}
                <div className="drag-handle">
                  <span className="drag-icon">⋮⋮</span>
                </div>

                {/* Question Number */}
                <div className="reorder-question-number">
                  <span className="number-badge">{index + 1}</span>
                </div>

                {/* Question Content */}
                <div className="reorder-question-content">
                  <span className="question-text">
                    {question.text || `問題 ${index + 1}`}
                  </span>
                </div>

                {/* Move Buttons */}
                <div className="move-buttons">
                  <button
                    className="move-btn"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    className="move-btn"
                    onClick={() => moveDown(index)}
                    disabled={index === localQuestions.length - 1}
                    title="下に移動"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <div className="summary-info">
            <span className="summary-text">
              {localQuestions.length}問の順序を変更中
            </span>
            <span className="summary-hint">
              変更を保存するには「保存」ボタンを押してください
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button 
            className="footer-btn cancel" 
            onClick={handleCancel}
            type="button"
          >
            キャンセル
          </button>
          <button 
            className="footer-btn save" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Save button clicked!');
              handleSave();
            }}
            type="button"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuestionReorderModal;
