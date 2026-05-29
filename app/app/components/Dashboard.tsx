"use client";

import { useState, useEffect, useMemo, useRef } from "react";

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

interface BrowserSerialPort {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface BrowserSerialApi {
  getPorts: () => Promise<BrowserSerialPort[]>;
  requestPort: () => Promise<BrowserSerialPort>;
  addEventListener?: (
    type: "connect" | "disconnect",
    listener: () => void,
  ) => void;
  removeEventListener?: (
    type: "connect" | "disconnect",
    listener: () => void,
  ) => void;
}

const MAX_SAMPLES = 1200;

interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  stroke: string;
  valueClassName: string;
  fixedRange?: {
    min: number;
    max: number;
  };
  read: (sample: SensorData) => number;
}

type ChartExportFormat = "svg" | "png" | "jpg";

function getBrowserSerialApi(): BrowserSerialApi | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  return (
    (navigator as Navigator & { serial?: BrowserSerialApi }).serial ?? null
  );
}

function describeBrowserPort(port: BrowserSerialPort, index: number): string {
  const info = port.getInfo?.();
  const vendor = info?.usbVendorId;
  const product = info?.usbProductId;

  if (typeof vendor === "number" && typeof product === "number") {
    return `Port ${index + 1} (VID:${vendor.toString(16).padStart(4, "0")} PID:${product
      .toString(16)
      .padStart(4, "0")})`;
  }

  return `Port ${index + 1}`;
}

const METRICS: MetricDefinition[] = [
  {
    key: "hallRevs",
    label: "Hall Revolutions",
    unit: "rev",
    stroke: "#2563eb",
    valueClassName: "text-blue-600 dark:text-blue-400",
    read: (sample) => sample.hall.revs,
  },
  {
    key: "hallRpm",
    label: "Hall RPM",
    unit: "rpm",
    stroke: "#1d4ed8",
    valueClassName: "text-blue-700 dark:text-blue-300",
    read: (sample) => sample.hall.rpm,
  },
  {
    key: "windSpeed",
    label: "Wind Speed",
    unit: "m/s",
    stroke: "#16a34a",
    valueClassName: "text-green-600 dark:text-green-400",
    fixedRange: {
      min: 0,
      max: 15,
    },
    read: (sample) => sample.wind.speed,
  },
  {
    key: "windTemp",
    label: "Temperature",
    unit: "degC",
    stroke: "#15803d",
    valueClassName: "text-green-700 dark:text-green-300",
    fixedRange: {
      min: 10,
      max: 35,
    },
    read: (sample) => sample.wind.temp,
  },
  {
    key: "powerVoltage",
    label: "Voltage",
    unit: "mV",
    stroke: "#ca8a04",
    valueClassName: "text-yellow-600 dark:text-yellow-400",
    read: (sample) => sample.power.voltage,
  },
  {
    key: "powerCurrent",
    label: "Current",
    unit: "mA",
    stroke: "#a16207",
    valueClassName: "text-yellow-700 dark:text-yellow-300",
    read: (sample) => sample.power.current,
  },
  {
    key: "powerPower",
    label: "Power",
    unit: "mW",
    stroke: "#854d0e",
    valueClassName: "text-yellow-800 dark:text-yellow-200",
    read: (sample) => sample.power.power,
  },
  {
    key: "loadForce",
    label: "Force",
    unit: "N",
    stroke: "#9333ea",
    valueClassName: "text-purple-600 dark:text-purple-400",
    read: (sample) => sample.load.force,
  },
  {
    key: "loadTorque",
    label: "Torque",
    unit: "N*m",
    stroke: "#7e22ce",
    valueClassName: "text-purple-700 dark:text-purple-300",
    read: (sample) => sample.load.torque,
  },
];

function Sparkline({
  values,
  stroke,
  chartId,
  label,
  unit,
  yMin,
  yMax,
}: {
  values: number[];
  stroke: string;
  chartId: string;
  label: string;
  unit: string;
  yMin?: number;
  yMax?: number;
}) {
  if (values.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
        Waiting for samples...
      </div>
    );
  }

  const width = 360;
  const height = 140;
  const left = 40;
  const right = 10;
  const top = 14;
  const bottom = 24;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const min = yMin ?? dataMin;
  const max = yMax ?? dataMax;
  const mid = min + (max - min) / 2;
  const range = max - min || 1;

  const points = values
    .map((value, idx) => {
      const x = left + (idx / (values.length - 1)) * plotWidth;
      const clampedValue = value < min ? min : value > max ? max : value;
      const y = top + (1 - (clampedValue - min) / range) * plotHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      id={chartId}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-28 rounded-md bg-zinc-100 dark:bg-zinc-700/40"
      role="img"
      aria-label={`${label} trend chart`}
    >
      <line
        x1={left}
        y1={top}
        x2={left}
        y2={height - bottom}
        stroke="#94a3b8"
        strokeWidth="1"
      />
      <line
        x1={left}
        y1={height - bottom}
        x2={width - right}
        y2={height - bottom}
        stroke="#94a3b8"
        strokeWidth="1"
      />

      <line
        x1={left}
        y1={top}
        x2={width - right}
        y2={top}
        stroke="#cbd5e1"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />
      <line
        x1={left}
        y1={top + plotHeight / 2}
        x2={width - right}
        y2={top + plotHeight / 2}
        stroke="#cbd5e1"
        strokeWidth="0.8"
        strokeDasharray="3 3"
      />

      <line
        x1={left - 4}
        y1={top}
        x2={left}
        y2={top}
        stroke="#64748b"
        strokeWidth="1"
      />
      <line
        x1={left - 4}
        y1={top + plotHeight / 2}
        x2={left}
        y2={top + plotHeight / 2}
        stroke="#64748b"
        strokeWidth="1"
      />
      <line
        x1={left - 4}
        y1={height - bottom}
        x2={left}
        y2={height - bottom}
        stroke="#64748b"
        strokeWidth="1"
      />

      <text
        x={left - 6}
        y={top + 4}
        textAnchor="end"
        fontSize="9"
        fill="#475569"
      >
        {max.toFixed(2)}
      </text>
      <text
        x={left - 6}
        y={top + plotHeight / 2 + 3}
        textAnchor="end"
        fontSize="9"
        fill="#475569"
      >
        {mid.toFixed(2)}
      </text>
      <text
        x={left - 6}
        y={height - bottom + 3}
        textAnchor="end"
        fontSize="9"
        fill="#475569"
      >
        {min.toFixed(2)}
      </text>

      <text x={left} y={height - 6} fontSize="9" fill="#475569">
        Oldest
      </text>
      <text
        x={width - right}
        y={height - 6}
        textAnchor="end"
        fontSize="9"
        fill="#475569"
      >
        Latest
      </text>

      <line
        x1={left + 2}
        y1={top - 8}
        x2={left + 20}
        y2={top - 8}
        stroke={stroke}
        strokeWidth="2.5"
      />
      <text x={left + 24} y={top - 5} fontSize="9" fill="#334155">
        {label} ({unit})
      </text>

      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function Dashboard() {
  const [browserPorts, setBrowserPorts] = useState<BrowserSerialPort[]>([]);
  const [selectedBrowserPortIndex, setSelectedBrowserPortIndex] =
    useState<number>(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [status, setStatus] = useState<string>("Disconnected");
  const [error, setError] = useState<string>("");
  const [chartExportFormat, setChartExportFormat] =
    useState<ChartExportFormat>("png");
  const serialPortRef = useRef<BrowserSerialPort | null>(null);
  const serialReaderRef =
    useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const isBrowserSerialSupported = useMemo(() => {
    return getBrowserSerialApi() !== null;
  }, []);

  const syncSelectedPortIndex = (
    nextPorts: BrowserSerialPort[],
    preferLast = false,
  ) => {
    setSelectedBrowserPortIndex((previous: number) => {
      if (nextPorts.length === 0) {
        return -1;
      }
      if (preferLast) {
        return nextPorts.length - 1;
      }
      if (previous < 0) {
        return 0;
      }
      return Math.min(previous, nextPorts.length - 1);
    });
  };

  const refreshGrantedPorts = async (preferLast = false) => {
    const serial = getBrowserSerialApi();
    if (!serial) {
      return;
    }

    const grantedPorts = await serial.getPorts();
    setBrowserPorts(grantedPorts);
    syncSelectedPortIndex(grantedPorts, preferLast);
  };

  const requestBrowserPort = async () => {
    try {
      const serial = getBrowserSerialApi();
      if (!serial) {
        setError("Web Serial is not supported in this browser.");
        return;
      }

      setError("");
      await serial.requestPort();
      await refreshGrantedPorts(true);
      setStatus("Port selected");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Port selection was cancelled";
      setError(message);
    }
  };

  const handleIncomingLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    try {
      const payload: SensorData = JSON.parse(trimmed);
      setSensorData(payload);
      setHistory((prev: SensorData[]) => {
        const next = [...prev, payload];
        if (next.length > MAX_SAMPLES) {
          return next.slice(-MAX_SAMPLES);
        }
        return next;
      });
    } catch {
      console.log("Raw data:", trimmed);
    }
  };

  useEffect(() => {
    if (!isBrowserSerialSupported) {
      setStatus("Web Serial not supported");
      setError(
        "This browser does not support Web Serial. Use Chrome, Edge, or another Chromium browser.",
      );
      return;
    }

    refreshGrantedPorts();
  }, [isBrowserSerialSupported]);

  useEffect(() => {
    const serial = getBrowserSerialApi();
    if (!serial?.addEventListener || !serial.removeEventListener) {
      return;
    }

    const handlePortTopologyChange = () => {
      refreshGrantedPorts();
    };

    serial.addEventListener("connect", handlePortTopologyChange);
    serial.addEventListener("disconnect", handlePortTopologyChange);

    return () => {
      serial.removeEventListener?.("connect", handlePortTopologyChange);
      serial.removeEventListener?.("disconnect", handlePortTopologyChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      serialReaderRef.current?.cancel();
      serialReaderRef.current = null;
      if (serialPortRef.current) {
        serialPortRef.current.close().catch(() => {
          // Ignore close errors during unmount.
        });
      }
      serialPortRef.current = null;
    };
  }, []);

  const chartSeries = useMemo(() => {
    return METRICS.map((metric) => {
      const values = history.map((sample: SensorData) => metric.read(sample));
      const latest = values[values.length - 1] ?? 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      return {
        ...metric,
        values,
        yMin: metric.fixedRange?.min,
        yMax: metric.fixedRange?.max,
        latest,
        min,
        max,
      };
    });
  }, [history]);

  const disconnect = async () => {
    try {
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel();
      }
    } catch {
      // Ignore reader cancellation errors.
    } finally {
      serialReaderRef.current = null;
    }

    try {
      if (serialPortRef.current) {
        await serialPortRef.current.close();
      }
    } catch {
      // Ignore close errors if the port is already closed.
    } finally {
      serialPortRef.current = null;
    }

    setIsConnected(false);
    setStatus("Disconnected");
  };

  const connectToArduino = async () => {
    if (!isBrowserSerialSupported) {
      setError("Web Serial is not supported in this browser.");
      return;
    }

    if (
      selectedBrowserPortIndex < 0 ||
      !browserPorts[selectedBrowserPortIndex]
    ) {
      setError("Select a serial port first");
      return;
    }

    const selectedPort = browserPorts[selectedBrowserPortIndex];

    await disconnect();
    setIsConnected(true);
    setError("");
    setStatus("Connecting...");

    try {
      await selectedPort.open({ baudRate: 9600 });
      serialPortRef.current = selectedPort;
      setStatus("Connected");

      const reader = selectedPort.readable?.getReader();
      if (!reader) {
        throw new Error("Selected port is not readable");
      }

      serialReaderRef.current = reader;
      const decoder = new TextDecoder();
      let buffered = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split(/\r?\n/);
        buffered = lines.pop() ?? "";

        for (const line of lines) {
          handleIncomingLine(line);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setStatus("Connection failed");
      setIsConnected(false);
      await disconnect();
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const sanitizeFilePart = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const exportChartById = async (
    chartId: string,
    metricLabel: string,
    format: ChartExportFormat,
  ) => {
    const svgElement = document.getElementById(chartId) as SVGSVGElement | null;
    if (!svgElement) {
      setError("Could not find chart to export");
      return;
    }

    setError("");
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const svgWithHeader =
      '<?xml version="1.0" encoding="UTF-8"?>\n' + serialized;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseName = `zephyr-chart-${sanitizeFilePart(metricLabel)}-${stamp}`;

    if (format === "svg") {
      const blob = new Blob([svgWithHeader], {
        type: "image/svg+xml;charset=utf-8",
      });
      triggerDownload(blob, `${baseName}.svg`);
      return;
    }

    const svgBlob = new Blob([svgWithHeader], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load chart image"));
        image.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      const exportWidth = 1280;
      const exportHeight = 360;
      canvas.width = exportWidth;
      canvas.height = exportHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        setError("Could not create image export context");
        return;
      }

      // Keep export readable in image viewers that do not apply page styles.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, exportWidth, exportHeight);
      context.drawImage(img, 0, 0, exportWidth, exportHeight);

      const mime = format === "png" ? "image/png" : "image/jpeg";
      const quality = format === "jpg" ? 0.92 : undefined;

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mime, quality);
      });

      if (!blob) {
        setError("Failed to generate chart export");
        return;
      }

      const extension = format === "png" ? "png" : "jpg";
      triggerDownload(blob, `${baseName}.${extension}`);
    } catch (err) {
      console.error(err);
      setError("Failed to export chart image");
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const exportAllCharts = async () => {
    for (const metric of METRICS) {
      // Export sequentially to avoid triggering too many simultaneous downloads.
      await exportChartById(
        `trend-${metric.key}`,
        metric.label,
        chartExportFormat,
      );
    }
  };

  const exportHistoryToCsv = () => {
    if (history.length === 0) {
      setError("No cached data to export yet");
      return;
    }

    const header = [
      "timestamp_iso",
      "timestamp_ms",
      "hall_revs",
      "hall_rpm",
      "wind_speed_ms",
      "wind_temp_c",
      "power_voltage_mv",
      "power_current_ma",
      "power_power_mw",
      "load_force_n",
      "load_torque_nm",
    ];

    const rows = history.map((sample: SensorData) => [
      new Date(sample.timestamp).toISOString(),
      sample.timestamp,
      sample.hall.revs,
      sample.hall.rpm,
      sample.wind.speed,
      sample.wind.temp,
      sample.power.voltage,
      sample.power.current,
      sample.power.power,
      sample.load.force,
      sample.load.torque,
    ]);

    const csvContent = [
      header.join(","),
      ...rows.map((row: Array<string | number>) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");

    anchor.href = url;
    anchor.download = `zephyr-cache-${stamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
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

          <p className="text-sm mb-4 text-zinc-500 dark:text-zinc-400">
            Uses your browser&apos;s Web Serial API so the hosted site can read
            serial devices connected to your computer.
          </p>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                Serial Port
              </label>
              <select
                value={selectedBrowserPortIndex}
                onChange={(e: { target: { value: string } }) =>
                  setSelectedBrowserPortIndex(Number(e.target.value))
                }
                disabled={isConnected}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white disabled:opacity-50"
              >
                {browserPorts.length === 0 ? (
                  <option value={-1}>No authorized ports yet</option>
                ) : (
                  browserPorts.map((port: BrowserSerialPort, index: number) => (
                    <option key={`browser-port-${index}`} value={index}>
                      {describeBrowserPort(port, index)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={requestBrowserPort}
              disabled={isConnected || !isBrowserSerialSupported}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Select Port
            </button>

            <button
              onClick={connectToArduino}
              disabled={
                isConnected ||
                selectedBrowserPortIndex < 0 ||
                !isBrowserSerialSupported
              }
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isConnected ? "Connected" : "Connect"}
            </button>

            <button
              onClick={disconnect}
              disabled={!isConnected}
              className="px-6 py-2 bg-zinc-600 hover:bg-zinc-700 disabled:bg-zinc-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Disconnect
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

          <div className="mt-5 pt-5 border-t border-zinc-200 dark:border-zinc-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Runtime cache:{" "}
              <span className="font-semibold">{history.length}</span> samples
              {history.length >= MAX_SAMPLES ? " (rolling buffer)" : ""}
            </div>
            <div className="flex gap-3">
              <button
                onClick={exportHistoryToCsv}
                disabled={history.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
              <button
                onClick={clearHistory}
                disabled={history.length === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-1 text-zinc-900 dark:text-white">
            Trends
          </h2>
          <p className="text-sm mb-4 text-zinc-500 dark:text-zinc-400">
            Live charts are generated from the in-app cache. Export uses this
            same cached dataset.
          </p>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-sm text-zinc-600 dark:text-zinc-300">
              Export format
            </label>
            <select
              value={chartExportFormat}
              onChange={(e) =>
                setChartExportFormat(e.target.value as ChartExportFormat)
              }
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-sm text-zinc-900 dark:text-white"
            >
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
              <option value="jpg">JPG</option>
            </select>
            <button
              onClick={exportAllCharts}
              disabled={history.length < 2}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Export All Charts
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chartSeries.map((series) => (
              <div
                key={series.key}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-900/40"
              >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {series.label}
                  </p>
                  <p
                    className={`text-sm font-semibold ${series.valueClassName}`}
                  >
                    {series.latest.toFixed(2)} {series.unit}
                  </p>
                </div>

                <Sparkline
                  values={series.values}
                  stroke={series.stroke}
                  chartId={`trend-${series.key}`}
                  label={series.label}
                  unit={series.unit}
                  yMin={series.yMin}
                  yMax={series.yMax}
                />

                <div className="mt-2">
                  <button
                    onClick={() =>
                      exportChartById(
                        `trend-${series.key}`,
                        series.label,
                        chartExportFormat,
                      )
                    }
                    disabled={series.values.length < 2}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-xs font-medium rounded-md transition-colors disabled:cursor-not-allowed"
                  >
                    Export {chartExportFormat.toUpperCase()}
                  </button>
                </div>

                <div className="mt-2 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>min: {series.min.toFixed(2)}</span>
                  <span>max: {series.max.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
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
