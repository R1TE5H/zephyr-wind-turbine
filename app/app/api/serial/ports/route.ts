import { SerialPort } from "serialport";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const ports = await SerialPort.list();

    // Filter for likely Arduino ports
    const arduinoPorts = ports.filter(
      (port) =>
        port.manufacturer?.toLowerCase().includes("arduino") ||
        port.manufacturer?.toLowerCase().includes("ftdi") ||
        port.path.includes("tty.usb") ||
        port.path.includes("ttyUSB") ||
        port.path.includes("ttyACM"),
    );

    return NextResponse.json({
      ports: arduinoPorts.length > 0 ? arduinoPorts : ports,
    });
  } catch (error) {
    console.error("Error listing serial ports:", error);
    return NextResponse.json(
      { error: "Failed to list serial ports" },
      { status: 500 },
    );
  }
}
