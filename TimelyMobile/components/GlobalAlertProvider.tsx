import React, { useState, useEffect } from 'react';
import CustomAlert from './CustomAlert';
import { alertService } from '../lib/alertService';

interface AlertConfig {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  autoClose?: number;
}

export default function GlobalAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  useEffect(() => {
    const unsubscribe = alertService.subscribe((config) => {
      setAlertConfig(config);
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    setAlertConfig(null);
    alertService.hide();
  };

  return (
    <>
      {children}
      {alertConfig && (
        <CustomAlert
          visible={true}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={handleClose}
          autoClose={alertConfig.autoClose}
        />
      )}
    </>
  );
} 