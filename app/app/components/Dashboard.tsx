"use client";

import { useState, useEffect } from "react";

interface SensorData {
  timestamp: number;
  hall: {
    revs: number;
    rpm: number;
  };
  wind: {
    speed: number;
    temp: number;
  };
  power: {
    voltage: number;
    current: number;
    power: number;
  };
  load: {
    force: number;
    torque: number;
  };
}

interface Port {
  path: string;
  manufacturer?: string;
}

export default function Dashboard() {
  const [ports, setPorts] = useState<Port[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [status, setStatus] = useState<string>("Disconnected");
  const [error, setError] = useState<string>("");

  // Fetch available ports
  useEffect(() => {
    fetch("/api/serial/ports")
      .then((res) => res.json())
      .then((data) => {
        setPorts(data.ports || []);
        if (data.ports?.length > 0) {
          setSelectedPort(data.ports[0].path);
        }
      })
      .catch((err) => {
        console.error("Error fetching ports:", err);
        setError("Failed to fetch serial ports");
      });
  }, []);

  const connectToArduino = () => {
    if (!selectedPort) {
      setError("Please select a port");
      return;
    }

    setIsConnected(true);
    setError("");
    setStatus("Connecting...");

    const eventSource = new EventSource(
      `/api/serial/stream?port=${encodeURIComponent(selectedPort)}`,
    );

    eventSource.onopen = () => {
      setStatus("Connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "connected") {
          setStatus(`Connected to ${message.port}`);
        } else if (message.type === "data") {
          setSensorData(message.payload);
        } else if (message.type === "error") {
          setError(message.message);
          setStatus("Error");
        } else if (message.type === "raw") {
          console.log("Raw data:", message.payload);
        }
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setStatus("Connection lost");
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-zinc-900 dark:text-white">
          Zephyr Wind Turbine Dashboard
        </h1>

        {/* Connection Panel */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">
            Connection
          </h2>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                Serial Port
              </label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={isConnected}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white disabled:opacity-50"
              >
                {ports.length === 0 ? (
                  <option>No ports found</option>
                ) : (
                  ports.map((port) => (
                    <option key={port.path} value={port.path}>
                      {port.path}{" "}
                      {port.manufacturer ? `(${port.manufacturer})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={connectToArduino}
              disabled={isConnected || !selectedPort}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isConnected ? "Connected" : "Connect"}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {status}
            </span>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Sensor Data Panels */}
        {sensorData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Hall Sensor */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">
                Hall Sensor
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Revolutions
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {sensorData.hall.revs}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    RPM
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {sensorData.hall.rpm}
                  </p>
                </div>
              </div>
            </div>

            {/* Wind Sensor */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">
                Wind Sensor
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Wind Speed
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {sensorData.wind.speed.toFixed(2)}{" "}
                    <span className="text-lg">m/s</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Temperature
                  </p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {sensorData.wind.temp.toFixed(1)}{" "}
                    <span className="text-lg">°C</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Power Monitor */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">
                Power Monitor
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Voltage
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {sensorData.power.voltage.toFixed(2)}{" "}
                    <span className="text-base">mV</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Current
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {sensorData.power.current.toFixed(2)}{" "}
                    <span className="text-base">mA</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Power
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {sensorData.power.power.toFixed(2)}{" "}
                    <span className="text-base">mW</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Load Cell */}
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">
                Load Cell
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Force
                  </p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {sensorData.load.force.toFixed(2)}{" "}
                    <span className="text-lg">N</span>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Torque
                  </p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {sensorData.load.torque.toFixed(2)}{" "}
                    <span className="text-lg">N·m</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!sensorData && isConnected && (
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              Waiting for data from Arduino...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
