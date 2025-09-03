"use client";

import { useState, useEffect } from 'react';

export default function AdminPage() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/maintenance')
      .then((res) => res.json())
      .then((data) => {
        setIsMaintenanceMode(data.isMaintenanceMode);
        setLoading(false);
      });
  }, []);

  const toggleMaintenanceMode = () => {
    setLoading(true);
    fetch('/api/maintenance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isMaintenanceMode: !isMaintenanceMode }),
    })
      .then((res) => res.json())
      .then((data) => {
        setIsMaintenanceMode(data.isMaintenanceMode);
        setLoading(false);
      });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Admin - Maintenance Mode</h1>
      <p>Maintenance mode is currently: {isMaintenanceMode ? 'ON' : 'OFF'}</p>
      <button onClick={toggleMaintenanceMode} disabled={loading}>
        {isMaintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
      </button>
    </div>
  );
}
