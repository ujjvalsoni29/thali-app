#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# dev-server.sh — start / stop / status for the backgrounded Thali dev server.
#
# Ported from maximus-app/scripts/dev-server.sh. Only the port, the URL and the
# names changed; every comment below records a bug that was already found and
# paid for once, so keep them (Thali _TEMPLATE.md: "port, don't re-derive").
#
# WHY THIS IS A FILE AND NOT A LINE IN Taskfile.yml
#
# Task does not shell out to bash. It runs `cmds` through mvdan/sh, a shell
# interpreter compiled into the Task binary. That interpreter understands `&`,
# but its process lifetime is the command's lifetime: when the cmd finishes, the
# interpreter tears down and anything it backgrounded goes with it. `nohup` does
# not save you — nohup only detaches from SIGHUP, and this isn't a hangup.
#
# The symptom, on Maximus, 2026-07-29: `restartm` printed "Dev server exited
# during startup" with an EMPTY log tail. Empty because npm never lived long
# enough to write a line. The pid file held a pid that had already been reaped by
# the time the very next cmd ran `kill -0` on it.
#
# So the launch happens here, in a real bash, where `&` plus `disown` produces a
# genuine orphan that gets reparented and outlives this script.
#
#   ./scripts/dev-server.sh start|stop|status
# ---------------------------------------------------------------------------
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

# 5473, not Maximus's 5373. All four projects are meant to run at once —
# Keystone 5273, Pulse 5173 — see thali-app/CLAUDE.md §8.
PORT=5473
URL="http://localhost:${PORT}"
PIDFILE=".wrangler/dev.pid"
LOGFILE=".wrangler/dev.log"

port_pids() { lsof -ti "tcp:${PORT}" -sTCP:LISTEN 2>/dev/null; }

# Kill a process and everything below it, deepest first.
#
# NOT `kill -TERM -$pgid`. Under Task there is no job control, so the dev server
# shares a process group with Task itself — signalling the group would kill the
# thing running the script. Walking the tree by hand is the only way to be sure
# we take workerd with us and nothing else. An orphaned workerd keeps port 5473,
# and vite.config.ts sets strictPort, so the next `up` would just die.
kill_tree() {
  local pid="$1" child
  [ -n "$pid" ] || return 0
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill -TERM "$pid" 2>/dev/null
}

running_pid() {
  [ -f "$PIDFILE" ] || return 1
  local pid; pid="$(cat "$PIDFILE" 2>/dev/null)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && { printf '%s' "$pid"; return 0; }
  return 1
}

cmd_start() {
  local pid
  if pid="$(running_pid)"; then
    echo "Already running (pid $pid) -> $URL"
    return 0
  fi

  local held; held="$(port_pids | tr '\n' ' ')"
  if [ -n "${held// /}" ]; then
    echo "Port $PORT is already held by pid(s): $held" >&2
    echo "Run 'task down' first, or kill it by hand." >&2
    return 1
  fi

  mkdir -p .wrangler
  : > "$LOGFILE"

  # setsid where it exists (Linux, and macOS if coreutils is installed) puts the
  # server in its own session, which makes it immune to anything that happens to
  # this terminal. Plain bash background + disown is the portable fallback.
  if command -v setsid >/dev/null 2>&1; then
    setsid npm run dev >>"$LOGFILE" 2>&1 &
  else
    npm run dev >>"$LOGFILE" 2>&1 &
  fi
  pid=$!
  disown "$pid" 2>/dev/null || true
  echo "$pid" > "$PIDFILE"

  echo "Waiting for $URL..."
  local i
  for i in $(seq 1 60); do
    if curl -sf -o /dev/null "$URL"; then
      echo "Web + API -> $URL   (one origin, no separate API port)"
      echo "D1        -> .wrangler/state (local SQLite)"
      echo "Logs      -> tail -f $LOGFILE"
      return 0
    fi
    # Vite can be listening before the pid we recorded settles, and npm can hand
    # off to a child and exit 0 on some setups. So a dead pid is only fatal if
    # nothing is on the port either — otherwise the server is up and we simply
    # tracked the wrong process. Re-point the pid file at whoever has the port.
    if ! kill -0 "$pid" 2>/dev/null; then
      local onport; onport="$(port_pids | head -1)"
      if [ -n "$onport" ]; then
        echo "$onport" > "$PIDFILE"
        pid="$onport"
        continue
      fi
      echo "Dev server exited during startup. Last 30 lines of $LOGFILE:" >&2
      tail -30 "$LOGFILE" >&2
      rm -f "$PIDFILE"
      return 1
    fi
    sleep 1
  done

  echo "No response after 60s. Last 30 lines of $LOGFILE:" >&2
  tail -30 "$LOGFILE" >&2
  return 1
}

cmd_stop() {
  local stopped=0 pid
  if pid="$(running_pid)"; then
    kill_tree "$pid"
    stopped=1
  fi
  rm -f "$PIDFILE"

  # Belt and braces: a `task dev` from another terminal, or a survivor of a hard
  # reboot, is not in our pid file but will still block the port.
  sleep 1
  local leftover; leftover="$(port_pids)"
  if [ -n "$leftover" ]; then
    for pid in $leftover; do kill_tree "$pid"; done
    stopped=1
    sleep 1
    leftover="$(port_pids)"
    [ -n "$leftover" ] && { echo "$leftover" | xargs kill -KILL 2>/dev/null || true; }
  fi

  [ "$stopped" -eq 1 ] && echo "Thali stopped." || echo "Thali wasn't running."
  return 0
}

cmd_status() {
  local onport; onport="$(port_pids | head -1)"
  if [ -n "$onport" ]; then
    echo "running  pid $onport  -> $URL"
  else
    echo "stopped"
  fi
}

case "${1:-}" in
  start)  cmd_start  ;;
  stop)   cmd_stop   ;;
  status) cmd_status ;;
  *) echo "usage: $0 {start|stop|status}" >&2; exit 2 ;;
esac
