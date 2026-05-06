import { useEffect, useState } from "react";
import { getTopConsumers } from "../../api/analytics.api";

export default function TopConsumers() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getTopConsumers();

      console.log("TOP CONSUMERS:", res.data);

      const list = res.data?.data?.data || [];

      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-secondary p-4 rounded-xl">
      <h2 className="text-lg font-semibold mb-4">Top Consumers</h2>

      {data.map((item: any) => (
        <div
          key={item.serverId}
          className="flex justify-between mb-2 text-sm"
        >
          <span>{item.serverName || "Server"}</span>
          <span className="text-orange-400">
            CPU: {item.cpu || 0}%
          </span>
        </div>
      ))}
    </div>
  );
}