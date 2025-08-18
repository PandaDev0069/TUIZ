import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

/**
 * CustomDropdown - Universal dropdown component with full styling control
 * 
 * @param {Object} props
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback when selection changes
 * @param {Array} props.options - Array of {value, label} objects
 * @param {string} props.placeholder - Placeholder text when no value selected
 * @param {React.Component} props.icon - Custom icon component (optional)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether dropdown is disabled
 */
const CustomDropdown = ({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  icon: Icon = FaChevronDown,
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get the label for the current value
  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`tuiz-dropdown ${className}`}
    >
      <div
        className={`tuiz-dropdown__trigger ${isOpen ? 'tuiz-dropdown__trigger--active' : ''} ${disabled ? 'tuiz-dropdown__trigger--disabled' : ''}`}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className="tuiz-dropdown__text">
          {displayText}
        </span>
        <Icon className="tuiz-dropdown__icon" />
      </div>
      
      <div 
        className={`tuiz-dropdown__menu ${!isOpen ? 'tuiz-dropdown__menu--hidden' : ''}`}
        role="listbox"
        aria-label="Options"
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={`tuiz-dropdown__option ${
              option.value === value ? 'tuiz-dropdown__option--selected' : ''
            }`}
            onClick={() => handleOptionClick(option.value)}
            role="option"
            aria-selected={option.value === value}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomDropdown;
