import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  const styles = {
    success: {
      gradient: 'bg-gradient-to-r from-green-900/95 via-emerald-900/95 to-green-900/95',
      shadow: 'shadow-lg shadow-green-500/30',
      border: 'border-l-4 border-green-400',
      icon: 'text-green-400',
      text: 'text-green-50',
      glow: 'ring-1 ring-green-500/20',
    },
    error: {
      gradient: 'bg-gradient-to-r from-red-900/95 via-rose-900/95 to-red-900/95',
      shadow: 'shadow-lg shadow-red-500/30',
      border: 'border-l-4 border-red-400',
      icon: 'text-red-400',
      text: 'text-red-50',
      glow: 'ring-1 ring-red-500/20',
    },
    info: {
      gradient: 'bg-gradient-to-r from-blue-900/95 via-cyan-900/95 to-blue-900/95',
      shadow: 'shadow-lg shadow-blue-500/30',
      border: 'border-l-4 border-blue-400',
      icon: 'text-blue-400',
      text: 'text-blue-50',
      glow: 'ring-1 ring-blue-500/20',
    },
    warning: {
      gradient: 'bg-gradient-to-r from-yellow-900/95 via-amber-900/95 to-yellow-900/95',
      shadow: 'shadow-lg shadow-yellow-500/30',
      border: 'border-l-4 border-yellow-400',
      icon: 'text-yellow-400',
      text: 'text-yellow-50',
      glow: 'ring-1 ring-yellow-500/20',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`
        flex items-center gap-3 px-5 py-4 rounded-xl
        ${style.gradient}
        ${style.shadow}
        ${style.border}
        ${style.glow}
        backdrop-blur-sm
        animate-slide-in-right
        transition-all duration-300
        hover:scale-105
      `}
    >
      <div className={`${style.icon} flex-shrink-0`}>
        {icons[type]}
      </div>
      <p className={`flex-1 text-sm font-semibold ${style.text} leading-relaxed`}>
        {message}
      </p>
      <button
        onClick={onClose}
        className={`
          ${style.icon}
          hover:opacity-70
          transition-all duration-200
          hover:rotate-90
          flex-shrink-0
        `}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
