import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="toast-icon" />,
    error: <XCircle className="toast-icon" />,
    warning: <AlertTriangle className="toast-icon" />,
    info: <Info className="toast-icon" />,
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      {icons[type]}
      <p className="toast-message">{message}</p>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
