import type { ChildProcess } from "node:child_process";

/** A failed API or worker stops its sibling so Render restarts the whole unit. */
export function supervise(
  children: ChildProcess[],
  setExitCode: (code: number) => void,
) {
  const alive = new Set(children);
  let stopping = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function stop(signal: NodeJS.Signals = "SIGTERM", failed = false) {
    if (stopping) return;
    stopping = true;
    setExitCode(failed ? 1 : 0);
    for (const child of alive) child.kill(signal);
    timer = setTimeout(() => {
      for (const child of alive) child.kill("SIGKILL");
    }, 25000);
    timer.unref();
  }
  for (const child of children) {
    child.once("error", () => {
      console.error("Service process could not start.");
      alive.delete(child);
      stop("SIGTERM", true);
    });
    child.once("exit", () => {
      alive.delete(child);
      if (!stopping) stop("SIGTERM", true);
      if (!alive.size && timer) clearTimeout(timer);
    });
  }
  return stop;
}
