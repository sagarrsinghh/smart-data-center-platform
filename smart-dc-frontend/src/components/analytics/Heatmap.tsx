import { useEffect, useState } from "react";
import { getHeatmap } from "../../api/analytics.api";

export default function Heatmap() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getHeatmap();

      console.log("HEATMAP:", res.data);

      const heat = res.data?.data?.data || [];

      setData(Array.isArray(heat) ? heat : []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-secondary p-4 rounded-xl">
      <h2 className="text-lg font-semibold mb-4">Heatmap</h2>

      <div className="grid grid-cols-10 gap-1">
        {data.map((item: any, i: number) => (
          <div
            key={i}
            className="w-6 h-6 rounded"
            style={{
              backgroundColor: getColor(item.value),
            }}
          />
        ))}
      </div>
    </div>
  );
}

// 🎨 color logic
function getColor(value: number) {
  if (value < 30) return "#22c55e"; // green
  if (value < 70) return "#facc15"; // yellow
  return "#ef4444"; // red
}