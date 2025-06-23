import React, { useState, useRef, useEffect } from 'react';

const TagDropdown = ({ options, onSelect, existingTags }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  // Filter out already selected tags
  const availableOptions = options.filter(option => 
    !existingTags.find(tag => tag.value === option.value)
  );

  if (availableOptions.length === 0) {
    return null;
  }

  return (
    <div className={styles.tagDropdown} ref={dropdownRef}>
      <button
        className={styles.tagDropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Add tag"
      >
        ➕
      </button>
      
      {isOpen && (
        <div className={styles.tagDropdownMenu}>
          {availableOptions.map(option => (
            <button
              key={option.value}
              className={styles.tagDropdownOption}
              onClick={() => handleSelect(option)}
            >
              <span className={styles.tagIcon}>{option.icon}</span>
              <span className={styles.tagName}>{option.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagDropdown; 