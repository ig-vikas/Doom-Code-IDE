import { useNotificationStore } from '../stores';
import type { Notification } from '../stores/notificationStore';
import {
  VscInfo,
  VscCheck,
  VscWarning,
  VscError,
  VscClose,
} from 'react-icons/vsc';

export default function Notifications() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismiss);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function NotificationItem({ notification, onDismiss }: { notification: Notification; onDismiss: () => void }) {
  const icon = {
    info: <VscInfo />,
    success: <VscCheck />,
    warning: <VscWarning />,
    error: <VscError />,
  }[notification.type];

  return (
    <div className={`notification ${notification.type}`}>
      <span className="notification-icon">{icon}</span>
      <div className="notification-body">
        <div className="notification-message">{notification.message}</div>
        {notification.details && (
          <div className="notification-details">{notification.details}</div>
        )}
      </div>
      <button className="notification-close" onClick={onDismiss}>
        <VscClose />
      </button>
    </div>
  );
}
