/**
 * Loopback-only endpoint that runs user-authored Python node code. The
 * renderer (sandboxed, no Node access) POSTs { code, inputs, data } as JSON;
 * this module spawns an isolated Python 3 subprocess ("python3 -I -"), feeds
 * the envelope on stdin, and returns the JSON the script prints on stdout.
 *
 * Guards: a custom request header (cross-origin pages cannot set it without a
 * CORS preflight the server never approves), a loopback Host check, body and
 * code size caps, an output cap, and a kill timeout. The code runs with the
 * privileges of the local user — it is the user's own code on their own
 * machine, never code from imported workflow files (those arrive untrusted
 * and are not auto-run by the app).
 */
import { spawn } from 'node:child_process';

export const PYTHON_NODE_RUN_PATH = '/python-node/run';
export const PYTHON_NODE_HEADER = 'x-tabular-python';
export const PYTHON_NODE_HEADER_VALUE = 'tabular-local';

const MAX_BODY_BYTES = 2_000_000;
const MAX_CODE_BYTES = 200_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 200;

/**
 * Runner executed by the Python subprocess. It reads one JSON envelope from
 * stdin ({ code, inputs, data }), execs the user code in a fresh namespace,
 * calls run(inputs, data), and prints exactly one JSON line on stdout:
 * { "ok": true, "output": ... } or { "ok": false, "error": ... }.
 */
const RUNNER_SOURCE = [
  'import json, sys, traceback',
  '',
  'def emit(payload):',
  '    try:',
  '        text = json.dumps(payload, allow_nan=False)',
  '    except (TypeError, ValueError):',
  '        text = json.dumps({"ok": False, "error": "run() must return a JSON-serializable value (no NaN or Infinity)."})',
  '    sys.stdout.write(text + "\\n")',
  '    sys.stdout.flush()',
  '',
  'def main():',
  '    try:',
  '        envelope = json.load(sys.stdin)',
  '    except Exception:',
  '        emit({"ok": False, "error": "The runner received an invalid JSON envelope."})',
  '        return',
  '    code = envelope.get("code") or ""',
  '    inputs = envelope.get("inputs") or {}',
  '    data = envelope.get("data") or {}',
  '    namespace = {"__name__": "__tabular_python_node__"}',
  '    try:',
  '        exec(compile(code, "<tabular-python-node>", "exec"), namespace)',
  '    except Exception:',
  '        emit({"ok": False, "error": "Syntax error: " + traceback.format_exc(limit=3).strip().splitlines()[-1]})',
  '        return',
  '    run = namespace.get("run")',
  '    if not callable(run):',
  '        emit({"ok": False, "error": "The script must define a function run(inputs, data)."})',
  '        return',
  '    try:',
  '        result = run(inputs, data)',
  '    except Exception:',
  '        emit({"ok": False, "error": traceback.format_exc(limit=5).strip().splitlines()[-1]})',
  '        return',
  '    emit({"ok": True, "output": result})',
  '',
  'main()',
  '',
].join('\n');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function isLoopbackHost(hostHeader) {
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(String(hostHeader || ''));
}

function pythonBinCandidates() {
  const override = process.env.TABULAR_PYTHON_BIN;
  // An explicit override is used exclusively, so tests and unusual installs
  // can point at exactly one interpreter.
  if (override) return [override];
  return ['python3', 'python', 'py'];
}

/**
 * Spawns one interpreter candidate and resolves with the collected result.
 * spawnError.code === 'ENOENT' signals "try the next candidate".
 */
function runPythonOnce(bin, envelopeJson, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      // The runner itself goes via -c so stdin stays free for the JSON envelope.
      child = spawn(bin, ['-I', '-c', RUNNER_SOURCE], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ spawnError: error });
      return;
    }

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let timedOut = false;
    let outputTruncated = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    child.on('error', (error) => {
      finish({ spawnError: error });
    });

    child.stdout.on('data', (chunk) => {
      if (stdout.byteLength + chunk.byteLength > MAX_OUTPUT_BYTES) {
        outputTruncated = true;
        child.kill('SIGKILL');
        return;
      }
      stdout = Buffer.concat([stdout, chunk]);
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.byteLength + chunk.byteLength <= MAX_OUTPUT_BYTES) {
        stderr = Buffer.concat([stderr, chunk]);
      }
    });

    child.on('close', (code) => {
      finish({ stdout, stderr, timedOut, outputTruncated, exitCode: code });
    });

    child.stdin.on('error', () => {});
    child.stdin.write(envelopeJson);
    child.stdin.end();
  });
}

function parseRunnerOutput(stdout, stderr) {
  const text = stdout.toString('utf8').trim();
  const lastLine = text.split('\n').filter(Boolean).pop() || '';

  try {
    return JSON.parse(lastLine);
  } catch {
    const stderrTail = stderr.toString('utf8').trim().split('\n').filter(Boolean).pop();
    return { ok: false, error: stderrTail || 'The Python script produced no JSON output.' };
  }
}

export async function handlePythonNodeRun(request, response) {
  if (request.headers[PYTHON_NODE_HEADER] !== PYTHON_NODE_HEADER_VALUE) {
    sendJson(response, 403, { ok: false, error: 'Forbidden' });
    return;
  }
  if (!isLoopbackHost(request.headers.host)) {
    sendJson(response, 403, { ok: false, error: 'Forbidden' });
    return;
  }

  let body;
  try {
    body = await readRequestBody(request);
  } catch {
    sendJson(response, 400, { ok: false, error: 'The request body could not be read.' });
    return;
  }
  if (body.byteLength > MAX_BODY_BYTES) {
    sendJson(response, 413, { ok: false, error: 'The request is too large.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body.toString('utf8'));
  } catch {
    sendJson(response, 400, { ok: false, error: 'The request body is not valid JSON.' });
    return;
  }

  const code = typeof payload?.code === 'string' ? payload.code : '';
  if (!code.trim()) {
    sendJson(response, 400, { ok: false, error: 'The script code is empty.' });
    return;
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    sendJson(response, 413, { ok: false, error: 'The script code is too large.' });
    return;
  }

  const requestedTimeout = Number(payload?.timeoutMs);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.min(Math.max(requestedTimeout, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;

  const envelopeJson = JSON.stringify({
    code,
    inputs: payload?.inputs && typeof payload.inputs === 'object' ? payload.inputs : {},
    data: payload?.data && typeof payload.data === 'object' ? payload.data : {},
  });

  let spawnMissing = true;

  for (const bin of pythonBinCandidates()) {
    const result = await runPythonOnce(bin, envelopeJson, timeoutMs);

    if (result.spawnError) {
      if (result.spawnError.code === 'ENOENT') {
        continue;
      }
      sendJson(response, 500, { ok: false, error: `Could not start Python: ${result.spawnError.message}` });
      return;
    }

    spawnMissing = false;

    if (result.timedOut) {
      sendJson(response, 200, {
        ok: false,
        error: `The script timed out after ${timeoutMs} ms and was stopped.`,
      });
      return;
    }
    if (result.outputTruncated) {
      sendJson(response, 200, { ok: false, error: 'The script output exceeded the size limit.' });
      return;
    }

    const parsed = parseRunnerOutput(result.stdout, result.stderr);
    if (parsed && typeof parsed === 'object' && 'ok' in parsed) {
      sendJson(response, 200, parsed);
    } else {
      sendJson(response, 200, { ok: false, error: 'The Python script produced no JSON output.' });
    }
    return;
  }

  if (spawnMissing) {
    sendJson(response, 503, {
      ok: false,
      error:
        'Python 3 was not found on this machine. Install Python 3 (python3/python/py) or set TABULAR_PYTHON_BIN to its path.',
    });
  }
}
