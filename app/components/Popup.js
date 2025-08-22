import React from 'react';
import './Popup.css';

const Popup = ({ display = 'center', isOpen, onClose, children }) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`popup-overlay ${display}`} onClick={handleOverlayClick}>
      <div className="popup-content">
        <button className="popup-close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Popup;