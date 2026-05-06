interface Props {
  alert: any;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}

export default function AlertItem({
  alert,
  onAcknowledge,
  onResolve,
}: Props) {
  return (
    <div className="bg-primary p-4 rounded-xl flex justify-between items-center">
      <div>
        <h4 className="font-bold">{alert.message}</h4>

        <p className="text-sm text-gray-400">
          Server: {alert.serverName}
        </p>

        <span
          className={`text-xs px-2 py-1 rounded ${
            alert.severity === "CRITICAL"
              ? "bg-red-600"
              : "bg-yellow-500"
          }`}
        >
          {alert.severity}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAcknowledge(alert.id)}
          className="bg-blue-500 px-3 py-1 rounded"
        >
          Ack
        </button>

        <button
          onClick={() => onResolve(alert.id)}
          className="bg-green-500 px-3 py-1 rounded"
        >
          Resolve
        </button>
      </div>
    </div>
  );
}