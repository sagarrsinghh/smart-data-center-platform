import { useState, useEffect } from "react";
import {
  getForecast,
  getAnomalies,
  getCapacity,
} from "../../api/prediction.api";

export default function PredictionPanel() {
  const [forecast, setForecast] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<any>(null);

  
  const fetchPrediction = async () => {
  try {
    const [fRes, aRes, cRes] = await Promise.all([
      getForecast(),
      getAnomalies(),
      getCapacity(),
    ]);

    console.log("FORECAST:", fRes.data);
    console.log("ANOMALIES:", aRes.data);
    console.log("CAPACITY:", cRes.data);

    // 🔥 FIXED (double nested)
    const forecastArray = fRes.data?.data?.data || [];
    const anomaliesArray = aRes.data?.data?.data || [];

    // 🛡 safety checks
    setForecast(Array.isArray(forecastArray) ? forecastArray : []);
    setAnomalies(Array.isArray(anomaliesArray) ? anomaliesArray : []);
    setCapacity(cRes.data?.data || {});
    
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    fetchPrediction();
  }, []);

  return (
    <div className="bg-secondary p-5 rounded-xl mt-6">
      <h3 className="text-lg mb-4">Prediction Insights</h3>

      {/* 📊 Forecast */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Forecast</h4>
        {forecast.length === 0 ? (
          <p className="text-gray-400">No forecast data</p>
        ) : (
          (Array.isArray(forecast) ? forecast : [])
  .slice(0, 5)
  .map((item, i) => (
    <div key={i}>
      {item.timestamp} → {item.value || item.cpu}%
    </div>
))
        )}
      </div>

      {/* 🚨 Anomalies */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Anomalies</h4>
        {anomalies.length === 0 ? (
          <p className="text-gray-400">No anomalies</p>
        ) : (
          anomalies.map((a, i) => (
            <div key={i} className="text-sm text-red-400">
              ⚠ {a.message || "Spike detected"}
            </div>
          ))
        )}
      </div>

      {/* 📦 Capacity */}
      <div>
        <h4 className="font-semibold mb-2">Capacity</h4>
        <p className="text-sm">
          Remaining: {capacity?.remaining || "N/A"}
        </p>
      </div>
    </div>
  );
}