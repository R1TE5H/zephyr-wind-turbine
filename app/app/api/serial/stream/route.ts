import { SerialPort } from "serialport";
import { ReadlineParser } from "@serialport/parser-readline";
import { NextRequest } from "next/server";

// Store active port connection
let activePort: SerialPort | null = null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const portPath = searchParams.get("port");

  if (!portPath) {
    return new Response(JSON.stringify({ error: "Port path is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      try {
        // Close existing port if any
        if (activePort?.isOpen) {
          activePort.close();
        }

        // Open new port
        activePort = new SerialPort({
          path: portPath,
          baudRate: 9600,
        });

        const parser = activePort.pipe(new ReadlineParser({ delimiter: "\n" }));

        activePort.on("open", () => {
          console.log(`Serial port ${portPath} opened`);
          controller.enqueue(
            `data: ${JSON.stringify({ type: "connected", port: portPath })}\n\n`,
          );
        });

        parser.on("data", (line: string) => {
          try {
            // Try to parse as JSON
            const data = JSON.parse(line);
            controller.enqueue(
              `data: ${JSON.stringify({ type: "data", payload: data })}\n\n`,
            );
          } catch {
            // If not JSON, send as raw text
            controller.enqueue(
              `data: ${JSON.stringify({ type: "raw", payload: line.trim() })}\n\n`,
            );
          }
        });

        activePort.on("error", (err) => {
          console.error("Serial port error:", err);
          controller.enqueue(
            `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`,
          );
        });

        activePort.on("close", () => {
          console.log("Serial port closed");
          controller.close();
        });
      } catch (error) {
        console.error("Error opening serial port:", error);
        controller.enqueue(
          `data: ${JSON.stringify({ type: "error", message: (error as Error).message })}\n\n`,
        );
        controller.close();
      }
    },
    cancel() {
      if (activePort?.isOpen) {
        activePort.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
