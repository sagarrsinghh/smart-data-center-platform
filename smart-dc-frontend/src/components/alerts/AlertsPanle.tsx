import { useEffect, useState } from "react";
import AlertItem from "./AlertItem";
import {
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "../../api/alerts.api";

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
  fetchAlerts();

  const interval = setInterval(() => {
    fetchAlerts();
  }, 5000);

  return () => clearInterval(interval);
}, []);

  const fetchAlerts = async () => {
    try {
      const res = await getActiveAlerts();

      console.log("ALERTS FULL:", res.data);

      // 🔥 FIXED (correct nested path)
      const alertsArray = res.data?.data?.data || [];

      // 🛡 safety check
      if (!Array.isArray(alertsArray)) {
        console.error("Alerts is not array:", alertsArray);
        setAlerts([]);
        return;
      }

      setAlerts(alertsArray);
    } catch (err) {
      console.error(err);
      setAlerts([]);
    }
  };

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    fetchAlerts();
  };

  const handleResolve = async (id: string) => {
    await resolveAlert(id);
    fetchAlerts();
  };

  return (
    <div className="bg-secondary p-5 rounded-xl mt-6">
      <h3 className="text-lg mb-4">Active Alerts</h3>

      <div className="flex flex-col gap-3">
        {alerts.length === 0 ? (
          <p className="text-gray-400">No active alerts</p>
        ) : (
          alerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))
        )}
      </div>
    </div>
  );
}