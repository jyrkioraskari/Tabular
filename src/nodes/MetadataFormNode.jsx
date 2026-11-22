/**
 * Node that embeds the SHACL form web component for dataset metadata editing.
 * It loads default or profile-selected shapes, tracks form validity, and emits
 * serialized RDF to connected workflow nodes automatically while the form is valid.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import '@ulb-darmstadt/shacl-form';
import {
  fetchDefaultMetadataShapes,
  fetchExternalClassInstances,
  fetchExternalMetadataRdf,
} from '../services/metadataShapesService';
import {
  deleteBrowserDraftsWithPrefix,
  readBrowserDraft,
  writeBrowserDraft,
} from '../services/browserDrafts';
import metadataFormIcon from '../assets/Architetto_--_Formulario.svg';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const defaultMetadataValuesSubject = 'https://example.org/datasets/ro-kit';
const defaultMetadataValues = `@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<${defaultMetadataValuesSubject}>
  a dcat:Dataset ;
  dcterms:conformsTo <https://w3id.org/nfdi4ing/profiles/4a5d4526-34d4-4b00-8f8f-4b13dd48e6d6> ;
  dcterms:title "RO-kit dataset"@en .
`;
const metadataDraftStoragePrefix = 'tabular-rdm.metadata-form-draft.v1';

export default function MetadataFormNode({ id, data, selected, onRdfChange }) {
  const formRef = useRef(null);
  const [isValid, setIsValid] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [defaultShapes, setDefaultShapes] = useState('');
  const [shapesError, setShapesError] = useState('');
  const [vocabularyWarning, setVocabularyWarning] = useState('');
  const shapes = data.shapes || defaultShapes;
  const formKey = data.shapesKey || (data.shapes ? `profile-${data.profileBaseUri}` : 'default');
  const profileId = data.shapesSource === 'coscine'
    ? `coscine:${data.profileBaseUri || ''}:${data.coscineResourceId || ''}`
    : data.shapesSource === 'aims'
      ? `aims:${data.profileBaseUri || ''}`
      : 'default';
  const storageKey = `${metadataDraftStoragePrefix}:${id}:${encodeURIComponent(profileId)}`;
  const [draftState, setDraftState] = useState(() => ({
    key: storageKey,
    draft: readBrowserDraft(storageKey),
  }));
  const storedDraft = draftState.key === storageKey
    ? draftState.draft
    : readBrowserDraft(storageKey);
  const rememberDraft = storedDraft?.enabled === true;
  const rememberByKeyRef = useRef(new Map());
  rememberByKeyRef.current.set(storageKey, rememberDraft);
  const [storageError, setStorageError] = useState('');
  const initialFormValuesRef = useRef(null);
  if (
    initialFormValuesRef.current?.formKey !== formKey ||
    initialFormValuesRef.current?.storageKey !== storageKey ||
    initialFormValuesRef.current?.carriedValuesRdf !== data.carriedValuesRdf
  ) {
    const savedRdf = typeof storedDraft?.rdf === 'string' ? storedDraft.rdf : '';
    const hasPrefilledValues = Boolean(data.carriedValuesRdf || savedRdf);
    initialFormValuesRef.current = {
      formKey,
      storageKey,
      carriedValuesRdf: data.carriedValuesRdf,
      values: data.carriedValuesRdf || savedRdf || (data.shapes ? undefined : defaultMetadataValues),
      subject: hasPrefilledValues || data.shapes ? undefined : defaultMetadataValuesSubject,
    };
  }
  const initialValues = initialFormValuesRef.current.values;
  const initialValuesSubject = initialFormValuesRef.current.subject;
  const profileInput = data.metadataProfileInput || '';
  const unavailableProfileInputs = profileInput
    ? ['Metadata Profile Search', 'Coscine'].filter((name) => name !== profileInput)
    : [];

  const saveDraft = useCallback((rdf, valid) => {
    const draft = { enabled: true, rdf, valid };

    try {
      writeBrowserDraft(storageKey, draft);
      setDraftState({ key: storageKey, draft });
      setStorageError('');
      return true;
    } catch {
      setStorageError('Metadata could not be saved in this browser.');
      return false;
    }
  }, [storageKey]);

  const removeSavedDraft = useCallback(() => {
    const previousRemember = rememberByKeyRef.current.get(storageKey);
    rememberByKeyRef.current.set(storageKey, false);

    try {
      deleteBrowserDraftsWithPrefix(`${metadataDraftStoragePrefix}:${id}:`);
      setDraftState({ key: storageKey, draft: null });
      setStorageError('');
    } catch {
      rememberByKeyRef.current.set(storageKey, previousRemember);
      setStorageError('Saved metadata could not be removed from this browser.');
    }
  }, [id, storageKey]);

  const handleRememberChange = useCallback((event) => {
    if (!event.target.checked) {
      removeSavedDraft();
      return;
    }

    try {
      const rdf = formRef.current?.serialize?.() || initialValues || '';
      saveDraft(rdf, isValid);
    } catch {
      setStorageError('Wait for the metadata form to finish loading, then try again.');
    }
  }, [initialValues, isValid, removeSavedDraft, saveDraft]);

  const setFormElement = useCallback((formElement) => {
    formRef.current = formElement;

    if (!formElement) {
      return;
    }

    // owl:imports supplies scoped vocabulary graphs; sh:class can also point
    // directly at a vocabulary. Supporting both covers AIMS and Coscine SHACL.
    formElement.setRdfUrlResolver?.(fetchExternalMetadataRdf);
    formElement.setClassInstanceProvider?.(async (classes) => {
      try {
        return await fetchExternalClassInstances(classes, {
          onError: (failures) => {
            if (formRef.current === formElement) {
              setVocabularyWarning(`${failures.length} external metadata vocabular${failures.length === 1 ? 'y is' : 'ies are'} temporarily unavailable. Some choice lists may be incomplete.`);
            }
          },
        });
      } catch {
        // The form can still render its shapes and any inline sh:in choices.
        return '';
      }
    });
  }, []);

  useEffect(() => {
    if (data.shapes) {
      return undefined;
    }

    let isActive = true;
    setShapesError('');

    fetchDefaultMetadataShapes()
      .then((loadedShapes) => {
        if (isActive) {
          setDefaultShapes(loadedShapes);
        }
      })
      .catch((error) => {
        if (isActive) {
          setShapesError(error.message || 'Unable to load metadata shapes.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [data.shapes]);

  useEffect(() => {
    const formElement = formRef.current;

    if (!shapes || !formElement) {
      return undefined;
    }

    let autosaveTimeoutId;
    let pendingValidity = null;

    const saveCurrentValues = (emit) => {
      if (pendingValidity === null || typeof formElement.serialize !== 'function') {
        return;
      }

      window.clearTimeout(autosaveTimeoutId);
      const valid = pendingValidity;
      pendingValidity = null;
      const rdf = formElement.serialize();

      if (rememberByKeyRef.current.get(storageKey)) {
        saveDraft(rdf, valid);
      }
      if (emit && valid) {
        onRdfChange?.(id, rdf);
      }
    };

    const onFormChange = (event) => {
      const valid = Boolean(event?.detail?.valid);
      setIsValid(valid);
      setHasSaved(false);

      if (!valid) {
        onRdfChange?.(id, '');
      }

      // Keep an optional browser draft even when the form is incomplete.
      // Valid RDF still reaches downstream nodes after the existing delay.
      pendingValidity = valid;
      window.clearTimeout(autosaveTimeoutId);
      autosaveTimeoutId = window.setTimeout(() => saveCurrentValues(true), 400);
    };

    const onFormSubmit = (event) => {
      event.preventDefault();
      setIsValid(true);
      setHasSaved(true);
      pendingValidity = true;
      saveCurrentValues(true);
    };

    formElement.addEventListener('change', onFormChange);
    formElement.addEventListener('submit', onFormSubmit);
    const onPageHide = () => saveCurrentValues(false);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearTimeout(autosaveTimeoutId);
      saveCurrentValues(false);
      formElement.removeEventListener('change', onFormChange);
      formElement.removeEventListener('submit', onFormSubmit);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [formKey, id, onRdfChange, saveDraft, shapes]);

  useEffect(() => {
    setIsValid(false);
    setHasSaved(false);
    setVocabularyWarning('');

    // A form prefilled with carried values keeps its RDF downstream; the form
    // re-emits on its first change. A blank form starts without metadata.
    if (!data.carriedValuesRdf) {
      const saved = readBrowserDraft(storageKey);
      onRdfChange?.(id, saved?.valid ? saved.rdf : '');
    }
  }, [formKey, id, onRdfChange, shapes, storageKey]);

  return (
    <div className={`metadata-form-node${selected ? ' selected' : ''}`}>
      <NodeHandle
        type="target"
        accepts={['Metadata Profile Search', 'Coscine']}
        connected={profileInput ? [profileInput] : []}
        unavailable={unavailableProfileInputs}
      />
      <div className="metadata-form-node__header">
        <img src={metadataFormIcon} alt="" className="metadata-form-node__icon" />
        <p className="metadata-form-node__title">{data.label}</p>
      </div>

      <div className="metadata-form-node__form-wrap">
        {shapes ? (
          <shacl-form
            key={formKey}
            ref={setFormElement}
            data-shapes={shapes}
            data-values={initialValues}
            data-values-subject={initialValuesSubject}
            data-show-root-shape-label=""
          />
        ) : (
          <p className="metadata-form-node__loading">
            {shapesError || 'Loading metadata form...'}
          </p>
        )}
      </div>

      {vocabularyWarning ? <p className="metadata-form-node__status" role="status">{vocabularyWarning}</p> : null}

      <p className="metadata-form-node__status">
        {hasSaved
          ? 'Metadata applied to connected nodes'
          : isValid
            ? 'Metadata is valid and applied automatically'
            : 'Metadata not valid yet'}
      </p>

      <div className="metadata-form-node__browser-storage nodrag">
        <label
          className="metadata-form-node__remember"
          title="Unchecking deletes saved form data from this browser."
        >
          <input
            type="checkbox"
            checked={rememberDraft}
            onChange={handleRememberChange}
            aria-description="Unchecking deletes saved form data from this browser."
          />
          Remember typed metadata in this browser
        </label>
        {rememberDraft ? (
          <button type="button" onClick={removeSavedDraft}>
            Delete saved browser copy
          </button>
        ) : null}
        {storageError ? <p role="alert">{storageError}</p> : null}
      </div>

      <NodeInfoButton nodeType="metadataForm" language={data.language} />
      <NodeHandle type="source" connectsTo={['RO-Crate', 'Coscine']} />
    </div>
  );
}
