interface Props {
  title: string;
  value: string | number;
  color: string;
}

export default function StatsCard({ title, value, color }: Props) {
  return (
    <div className={`p-5 rounded-xl shadow-lg ${color}`}>
      <h3 className="text-sm text-gray-200">{title}</h3>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}