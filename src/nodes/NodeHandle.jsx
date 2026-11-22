import { Handle, Position } from '@xyflow/react';

export default function NodeHandle({
  type,
  accepts = [],
  connectsTo = [],
  connected = [],
  unavailable = [],
}) {
  const isInput = type === 'target';
  const compatibleNodes = isInput ? accepts : connectsTo;

  if (compatibleNodes.length === 0) {
    return null;
  }

  const connectionDirection = isInput ? 'Connect from' : 'Connect to';
  const connectionDescription = `${connectionDirection}: ${compatibleNodes
    .map((nodeName) => {
      if (connected.includes(nodeName)) return `${nodeName} (connected)`;
      if (unavailable.includes(nodeName)) return `${nodeName} (not allowed)`;
      return nodeName;
    })
    .join(', ')}`;

  return (
    <Handle
      type={type}
      position={isInput ? Position.Left : Position.Right}
      className={`node-handle node-handle--${isInput ? 'input' : 'output'}`}
      title={connectionDescription}
      aria-label={connectionDescription}
    >
      <span className="node-handle__icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          {isInput ? (
            <>
              <path d="M2 8h8" />
              <path d="m7 5 3 3-3 3" />
              <path d="M12.5 3.5v9" />
            </>
          ) : (
            <>
              <path d="M4 8h8" />
              <path d="m9 5 3 3-3 3" />
              <path d="M3.5 3.5v9" />
            </>
          )}
        </svg>
      </span>
      <span className="node-handle__tooltip" role="tooltip">
        <span className="node-handle__tooltip-title">{connectionDirection}</span>
        <ul>
          {compatibleNodes.map((nodeName) => (
            <li
              key={nodeName}
              className={
                connected.includes(nodeName)
                  ? 'node-handle__option node-handle__option--connected'
                  : unavailable.includes(nodeName)
                    ? 'node-handle__option node-handle__option--unavailable'
                    : 'node-handle__option'
              }
            >
              <span>{nodeName}</span>
              {connected.includes(nodeName) ? (
                <span className="node-handle__option-status">connected</span>
              ) : unavailable.includes(nodeName) ? (
                <span className="node-handle__option-status">not allowed</span>
              ) : null}
            </li>
          ))}
        </ul>
      </span>
    </Handle>
  );
}
