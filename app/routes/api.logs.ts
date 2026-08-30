import type { ActionFunctionArgs } from "@react-router/node";
import db from "../db.server";

export async function loader({ request }: ActionFunctionArgs) {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Poll database for new logs
      const interval = setInterval(() => {
        const logs = db.prepare("SELECT * FROM system_logs ORDER BY id DESC LIMIT 10").all();
        send(logs);
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
