// Parse the Claude Code Stop hook payload. `last_assistant_message` carries the
// final reply text, so hooks read it directly instead of parsing the transcript.
export interface StopInput {
  lastMessage: string;
  lineCount: number;
  stopHookActive: boolean;
  sessionId: string;
}

export function countLines(text: string): number {
  const body = text.trimEnd();
  return body === "" ? 0 : body.split("\n").length;
}

export function parseStopInput(raw: string): StopInput {
  const data = raw ? JSON.parse(raw) : {};
  const lastMessage: string = data.last_assistant_message ?? "";
  return {
    lastMessage,
    lineCount: countLines(lastMessage),
    stopHookActive: data.stop_hook_active === true,
    sessionId: data.session_id ?? "session",
  };
}

export async function readStopInput(): Promise<StopInput> {
  return parseStopInput(await Bun.stdin.text());
}
