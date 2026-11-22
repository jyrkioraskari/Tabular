import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import coscineLogo from '../assets/coscine_rgb.svg';
import {
  fetchCoscineApplicationProfileDefinition,
  fetchCoscineResourceOptions,
  uploadROCrateToCoscine,
} from '../services/coscineApi';
import { configuredDatasetLicense, createROCratePackage } from '../services/roCrateExport';
import NodeHandle from './NodeHandle';
import NodeInfoButton from './NodeInfoButton';

const coscineTokenStorageKey = 'tabular-rdm.coscine-api-token.v1';

function readStoredApiToken() {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(coscineTokenStorageKey) || '';
  } catch {
    return '';
  }
}

export default function CoscineNode({
  id,
  data,
  selected,
  onApplicationProfileLoaded,
  onUploadStateChange,
}) {
  const [apiToken, setApiToken] = useState(readStoredApiToken);
  const [rememberApiToken, setRememberApiToken] = useState(
    () => Boolean(readStoredApiToken()),
  );
  const [tokenStorageError, setTokenStorageError] = useState('');
  const [resources, setResources] = useState([]);
  const [selectedResourceKey, setSelectedResourceKey] = useState('');
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState('idle');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const resourceRequestIdRef = useRef(0);
  const tokenHelpIsGerman = data.language === 'de';
  const tokenHelpUrl = tokenHelpIsGerman
    ? 'https://docs.coscine.de/de/token/'
    : 'https://docs.coscine.de/en/token/';
  const tokenHelpTitle = tokenHelpIsGerman
    ? 'Im Coscine-Nutzendenprofil Zugriffstoken öffnen, Name und Ablaufdatum angeben, Token erstellen und sofort kopieren.'
    : 'In your Coscine user profile, open Access Token, enter a name and expiration date, create the token, and copy it immediately.';
  const uploadMetadata = data.roCrateInput?.metadataContent?.trim() ?? '';
  const canBuildCrate = Boolean(data.roCrateInput?.jsonLdContent?.jsonLd?.trim());
  const datasetLicense = configuredDatasetLicense(data.roCrateInput?.sheets)
    || data.roCrateInput?.datasetLicense || '';
  const hasUploadMetadata = Boolean(uploadMetadata);
  const selectedResource = useMemo(
    () => resources.find((resource) => resource.key === selectedResourceKey) ?? null,
    [resources, selectedResourceKey],
  );

  useEffect(() => {
    if (!rememberApiToken) return;

    try {
      if (apiToken) {
        window.localStorage.setItem(coscineTokenStorageKey, apiToken);
      } else {
        window.localStorage.removeItem(coscineTokenStorageKey);
      }
      setTokenStorageError('');
    } catch {
      setTokenStorageError('The token could not be saved in this browser.');
    }
  }, [apiToken, rememberApiToken]);

  const handleRememberApiTokenChange = useCallback(
    (event) => {
      const shouldRemember = event.target.checked;
      let nextRememberState = shouldRemember;

      try {
        if (shouldRemember && apiToken) {
          window.localStorage.setItem(coscineTokenStorageKey, apiToken);
        } else {
          window.localStorage.removeItem(coscineTokenStorageKey);
        }
        setTokenStorageError('');
      } catch {
        nextRememberState = !shouldRemember;
        setTokenStorageError(
          shouldRemember
            ? 'The token could not be saved in this browser.'
            : 'The stored token could not be removed from this browser.',
        );
      }

      setRememberApiToken(nextRememberState);
    },
    [apiToken],
  );

  const loadResources = useCallback(async (token) => {
    const requestId = resourceRequestIdRef.current + 1;
    resourceRequestIdRef.current = requestId;
    setIsLoadingResources(true);
    setError('');
    setStatus('Loading resources...');

    try {
      const resourceOptions = await fetchCoscineResourceOptions(token);

      if (resourceRequestIdRef.current !== requestId) {
        return;
      }

      const options = resourceOptions.map((resource) => ({
        ...resource,
        key: `${resource.projectId}:${resource.resourceId}`,
      }));

      setResources(options);
      setSelectedResourceKey((currentKey) => {
        if (options.some((resource) => resource.key === currentKey)) {
          return currentKey;
        }

        // Restores the resource selected in a previous workflow after a
        // template switch; the token itself persists in browser storage.
        if (
          data.preselectedResourceKey &&
          options.some((resource) => resource.key === data.preselectedResourceKey)
        ) {
          return data.preselectedResourceKey;
        }

        return options[0]?.key ?? '';
      });
      setStatus(
        options.length > 0
          ? `Loaded ${options.length} resource${options.length === 1 ? '' : 's'}.`
          : 'No writable resources found for this token.',
      );
    } catch (loadError) {
      if (resourceRequestIdRef.current !== requestId) {
        return;
      }

      setError(loadError.message || 'Could not load Coscine resources.');
      setStatus('');
    } finally {
      if (resourceRequestIdRef.current === requestId) {
        setIsLoadingResources(false);
      }
    }
  }, [data.preselectedResourceKey]);

  useEffect(() => {
    resourceRequestIdRef.current += 1;
    setResources([]);
    setSelectedResourceKey('');
    setIsLoadingResources(false);

    const token = apiToken.trim();

    if (!token) {
      setError('');
      setStatus('Enter an API token to load resources automatically.');
      return undefined;
    }

    setError('');
    setStatus('API token detected. Loading resources...');
    const timeoutId = window.setTimeout(() => loadResources(token), 500);

    return () => {
      window.clearTimeout(timeoutId);
      resourceRequestIdRef.current += 1;
    };
  }, [apiToken, loadResources]);

  useEffect(() => {
    if (!selectedResource || !apiToken.trim()) {
      onApplicationProfileLoaded?.(id, null);
      return undefined;
    }

    let isActive = true;
    setIsLoadingProfile(true);
    setError('');
    setStatus('Loading Coscine form...');

    fetchCoscineApplicationProfileDefinition(
      apiToken,
      selectedResource.applicationProfileUri,
    )
      .then((profileDefinition) => {
        if (!isActive) {
          return;
        }

        onApplicationProfileLoaded?.(id, {
          ...profileDefinition,
          resourceId: selectedResource.resourceId,
          resourceName: selectedResource.resourceName,
          projectId: selectedResource.projectId,
          projectName: selectedResource.projectName,
        });
        setStatus('');
      })
      .catch((profileError) => {
        if (!isActive) {
          return;
        }

        onApplicationProfileLoaded?.(id, null);
        setError(profileError.message || 'Could not load the Coscine form.');
        setStatus('');
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [apiToken, id, onApplicationProfileLoaded, selectedResource]);

  useEffect(() => {
    // A previously completed upload no longer matches this token/resource pair.
    setUploadState('idle');
<<<<<<< HEAD
  }, [apiToken, datasetLicense, selectedResourceKey]);
=======
  }, [apiToken, selectedResourceKey]);
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571

  useEffect(() => {
    onUploadStateChange?.(id, {
      hasToken: apiToken.trim().length > 0,
      hasSelectedResource: Boolean(selectedResource),
      uploadState,
    });
  }, [apiToken, id, onUploadStateChange, selectedResource, uploadState]);

  const handleUpload = useCallback(async () => {
    setIsUploading(true);
    setUploadState('uploading');
    setError('');
    setStatus('Building RO-Crate...');

    try {
      const cratePackage = await createROCratePackage({
        jsonLdContent: data.roCrateInput?.jsonLdContent,
        sheets: data.roCrateInput?.sheets,
        columnDescriptions: data.roCrateInput?.columnDescriptions,
        sourceFile: data.roCrateInput?.sourceFile,
<<<<<<< HEAD
        selectedSheetName: data.roCrateInput?.selectedSheetName,
        datasetLicense,
=======
>>>>>>> baa438668abdbef539b592d4f09a2e9066ccf571
      });

      setStatus('Uploading RO-Crate...');
      await uploadROCrateToCoscine({
        apiToken,
        projectId: selectedResource?.projectId,
        resourceId: selectedResource?.resourceId,
        crateBlob: cratePackage.blob,
        fileName: cratePackage.fileName,
        metadataContent: uploadMetadata,
        profile: data.coscineApplicationProfile,
      });
      setStatus(`Uploaded ${cratePackage.fileName}.`);
      setUploadState('uploaded');
    } catch (uploadError) {
      setError(uploadError.message || 'Could not upload the RO-Crate.');
      setStatus('');
      setUploadState('error');
    } finally {
      setIsUploading(false);
    }
  }, [apiToken, data.coscineApplicationProfile, data.roCrateInput, datasetLicense, selectedResource, uploadMetadata]);

  const uploadDisabled =
    isUploading ||
    !apiToken.trim() ||
    !selectedResource ||
    !canBuildCrate ||
    !datasetLicense ||
    !hasUploadMetadata;

  return (
    <div className={`coscine-node${selected ? ' selected' : ''}`}>
      <NodeHandle type="target" accepts={['RO-Crate', 'Metadata Form']} />
      <div className="coscine-node__header">
        <img src={coscineLogo} alt="" className="coscine-node__icon" />
        <p className="coscine-node__title">{data.label}</p>
      </div>
      <form onSubmit={(event) => event.preventDefault()}>
      <label className="coscine-node__label">
        <span className="coscine-node__label-heading">
          <span>API token</span>
          <a
            className="coscine-node__help-link nodrag nopan"
            href={tokenHelpUrl}
            target="_blank"
            rel="noreferrer"
            title={tokenHelpTitle}
            aria-label={`${
              tokenHelpIsGerman ? 'So erstellst du ein Coscine-API-Token' : 'How to get a Coscine API token'
            } (${tokenHelpIsGerman ? 'öffnet einen neuen Tab' : 'opens in a new tab'})`}
          >
            {tokenHelpIsGerman ? 'Token erstellen ↗' : 'How to get one ↗'}
          </a>
        </span>
        <input
          className="coscine-node__input nodrag"
          type="password"
          value={apiToken}
          placeholder="Bearer token"
          autoComplete="off"
          onChange={(event) => setApiToken(event.target.value)}
        />
      </label>
      <label className="coscine-node__remember nodrag">
        <input
          type="checkbox"
          checked={rememberApiToken}
          onChange={handleRememberApiTokenChange}
        />
        Remember token in this browser
      </label>
      </form>
      {tokenStorageError ? (
        <p className="coscine-node__storage-error">{tokenStorageError}</p>
      ) : null}
      <label className="coscine-node__label">
        Resource
        <select
          className="coscine-node__select nodrag"
          value={selectedResourceKey}
          disabled={isLoadingResources || resources.length === 0}
          onChange={(event) => setSelectedResourceKey(event.target.value)}
        >
          <option value="">Select a resource</option>
          {resources.map((resource) => (
            <option key={resource.key} value={resource.key}>
              {resource.projectName} / {resource.resourceName}
              {resource.resourceType ? ` (${resource.resourceType})` : ''}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="coscine-node__button coscine-node__button--primary nodrag"
        disabled={uploadDisabled}
        onClick={handleUpload}
      >
        {isUploading ? 'Uploading...' : 'Upload RO-Crate'}
      </button>
      <p className="coscine-node__status">
        {status ||
          (isLoadingProfile
            ? 'Loading Coscine form...'
            : canBuildCrate
              ? !datasetLicense
                ? 'Choose a dataset licence in the RO-Crate node before uploading.'
                : hasUploadMetadata
                  ? 'Ready to upload the RO-Crate resource.'
                  : 'Save Coscine metadata before uploading.'
            : 'Connect an RO-Crate node to upload.')}
      </p>
      {error ? <p className="coscine-node__error">{error}</p> : null}
      <NodeInfoButton nodeType="coscine" language={data.language} />
      <NodeHandle type="source" connectsTo={['Metadata Form']} />
    </div>
  );
}
