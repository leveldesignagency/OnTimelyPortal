type AlertType = 'success' | 'error' | 'info';

interface AlertConfig {
  type: AlertType;
  title: string;
  message: string;
  autoClose?: number;
}

class AlertService {
  private listeners: Array<(config: AlertConfig | null) => void> = [];

  // Subscribe to alert changes
  subscribe(listener: (config: AlertConfig | null) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Show an alert
  private showAlert(config: AlertConfig) {
    this.listeners.forEach(listener => listener(config));
  }

  // Hide current alert
  hide() {
    this.listeners.forEach(listener => listener(null));
  }

  // Convenience methods
  success(title: string, message: string, autoClose?: number) {
    this.showAlert({ type: 'success', title, message, autoClose });
  }

  error(title: string, message: string, autoClose?: number) {
    this.showAlert({ type: 'error', title, message, autoClose });
  }

  info(title: string, message: string, autoClose?: number) {
    this.showAlert({ type: 'info', title, message, autoClose });
  }
}

export const alertService = new AlertService();

// Replace React Native's Alert.alert with our custom implementation
export const showAlert = (title: string, message?: string, buttons?: any[], options?: any) => {
  // Simple implementation - just show as info alert
  alertService.info(title, message || '', 3000);
};

// Override global Alert.alert to use our custom implementation
if (typeof global !== 'undefined') {
  const originalAlert = global.Alert?.alert;
  if (global.Alert) {
    global.Alert.alert = (title: string, message?: string, buttons?: any[], options?: any) => {
      alertService.info(title, message || '', 3000);
    };
  }
} 