/** Browser and server memory settings. Persistence stays in useColumnAnnotationMemory. */
import { useId } from 'react';

export default function ColumnAnnotationMemoryControls({
  rememberAnnotations, storageError, annotationMemory, groupSettings, groupBusy, groupError,
  changeGroupSettings, refreshGroupChoices, shareSavedChoices, handleRememberChange,
}) {
  const groupCodeInputId = useId();
  return (
    <div className="column-description-node__browser-storage nodrag">
      <div className="column-description-node__group-memory">
        <strong
          className="column-description-node__memory-heading"
          title="People using this Tabular server can share choices with the same group code. Turning this on shares new selections, including their column descriptions. Anyone with the code can see them."
          tabIndex={0}
        >Memory</strong>
        <div className="column-description-node__memory-code-row">
          <label htmlFor={groupCodeInputId}>Group code</label>
          <input
            id={groupCodeInputId}
            type="text"
            value={groupSettings.code}
            onChange={(event) => changeGroupSettings({ enabled: false, code: event.target.value.trim() })}
            placeholder="Enter or generate a group code"
          />
          <button type="button" onClick={() => changeGroupSettings({ enabled: false, code: globalThis.crypto.randomUUID() })}>Generate code</button>
        </div>
        <label className="column-description-node__memory-option">
          <input
            type="checkbox"
            checked={groupSettings.enabled}
            disabled={groupSettings.code.length < 12}
            onChange={(event) => changeGroupSettings({ ...groupSettings, enabled: event.target.checked })}
          />
          Use shared group memory
        </label>
        {groupSettings.enabled ? (
          <div className="column-description-node__memory-actions">
            <button type="button" disabled={groupBusy} onClick={refreshGroupChoices}>Refresh shared choices</button>
            <button type="button" disabled={groupBusy || !rememberAnnotations || !annotationMemory.length} onClick={shareSavedChoices}>Share my saved choices</button>
            {groupBusy ? <span>Loading shared choices...</span> : null}
          </div>
        ) : null}
        {groupError ? <p role="alert">{groupError}</p> : null}
      </div>
      <label
        className="column-description-node__remember column-description-node__memory-option"
        title="Unchecking deletes this node's saved copy and all remembered choices from this browser."
      >
        <input
          type="checkbox"
          checked={rememberAnnotations}
          onChange={handleRememberChange}
          aria-description="Unchecking deletes this node's saved copy and all remembered choices from this browser."
        />
        Remember column annotations in this browser
      </label>
      {storageError ? <p role="alert">{storageError}</p> : null}
    </div>
  );
}
