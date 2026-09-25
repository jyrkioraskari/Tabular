/**
 * AIMS API client used by metadata profile search and metadata form setup.
 * It discovers the current application-profile endpoint from Swagger, searches
 * profiles, and returns SHACL/Turtle definitions for selected profiles.
 */
const AIMS_SWAGGER_URL = 'https://aims-backend.tools.coscine.dev/swagger/v1/swagger.json';
const AIMS_API_ORIGIN = new URL(AIMS_SWAGGER_URL).origin;
const AIMS_PROXY_PATH = '/aims-api';
const APPLICATION_PROFILES_PATH = '/AIMS/application-profiles';
const APPLICATION_PROFILE_PATH = `${APPLICATION_PROFILES_PATH}/{uri}`;
export const DEFAULT_PROFILE_QUERY = 'RO-kit';

function getAimsFetchUrl(url) {
  const targetUrl = new URL(url, AIMS_API_ORIGIN);

  if (targetUrl.origin !== AIMS_API_ORIGIN) {
    throw new Error(`AIMS Swagger references an unsupported server: ${targetUrl.origin}`);
  }

  return `${AIMS_PROXY_PATH}${targetUrl.pathname}${targetUrl.search}`;
}

function getSwaggerOperation(specification) {
  return specification?.paths?.[APPLICATION_PROFILES_PATH]?.get;
}

function getOperationParameter(operation, parameterName) {
  return operation?.parameters?.find(
    (parameter) => parameter.in === 'query' && parameter.name === parameterName,
  );
}

function getApplicationProfilesUrl(specification) {
  const swaggerUrl = new URL(AIMS_SWAGGER_URL);
  const operation = getSwaggerOperation(specification);

  if (!operation || !getOperationParameter(operation, 'query')) {
    throw new Error('AIMS Swagger does not define the expected application-profiles query endpoint.');
  }

  const serverUrl = specification?.servers?.[0]?.url;
  const baseUrl = serverUrl ? new URL(serverUrl, swaggerUrl) : swaggerUrl;

  return new URL(APPLICATION_PROFILES_PATH, baseUrl.origin);
}

function getApplicationProfileUrl(specification, baseUri) {
  const swaggerUrl = new URL(AIMS_SWAGGER_URL);
  const operation = specification?.paths?.[APPLICATION_PROFILE_PATH]?.get;

  if (!operation || !operation.parameters?.some(
    (parameter) => parameter.in === 'path' && parameter.name === 'uri',
  )) {
    throw new Error('AIMS Swagger does not define the expected single-profile endpoint.');
  }

  const serverUrl = specification?.servers?.[0]?.url;
  const baseUrl = serverUrl ? new URL(serverUrl, swaggerUrl) : swaggerUrl;
  const profileUrl = new URL(
    `${APPLICATION_PROFILES_PATH}/${encodeURIComponent(baseUri)}`,
    baseUrl.origin,
  );

  if (getOperationParameter(operation, 'includeDefinition')) {
    profileUrl.searchParams.set('includeDefinition', 'true');
  }

  return profileUrl;
}

function normalizeProfiles(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.value)) {
    return payload.value;
  }

  return [];
}

export function getProfileBaseUri(profile) {
  return profile?.base_url ?? profile?.baseUri ?? profile?.['base-uri'] ?? '';
}

function getProfileDefinition(profile) {
  return typeof profile?.definition === 'string' ? profile.definition.trim() : '';
}

function buildSingleProfileDefinition(profile) {
  const definition = getProfileDefinition(profile);

  if (!definition) {
    return '';
  }

  const name = profile.name ?? 'Unnamed application profile';
  const baseUri = getProfileBaseUri(profile);

  return [
    `# ${name}`,
    baseUri ? `# base-uri: ${baseUri}` : '',
    definition,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Discovers the current AIMS application-profile endpoint from Swagger before
 * querying it. This avoids hard-coding a deployment host beyond the Swagger URL.
 */
export async function fetchAimsApplicationProfiles({
  query,
  includeDefinition = false,
  signal,
}) {
  const swaggerResponse = await fetch(getAimsFetchUrl(AIMS_SWAGGER_URL), {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!swaggerResponse.ok) {
    throw new Error(`Unable to load AIMS Swagger specification (${swaggerResponse.status}).`);
  }

  const specification = await swaggerResponse.json();
  const operation = getSwaggerOperation(specification);
  const profilesUrl = getApplicationProfilesUrl(specification);

  profilesUrl.searchParams.set('query', query);

  if (includeDefinition && getOperationParameter(operation, 'includeDefinition')) {
    profilesUrl.searchParams.set('includeDefinition', 'true');
  }

  const profilesResponse = await fetch(getAimsFetchUrl(profilesUrl), {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!profilesResponse.ok) {
    throw new Error(`Unable to load AIMS application profiles (${profilesResponse.status}).`);
  }

  return normalizeProfiles(await profilesResponse.json());
}

export function buildProfileSummary(profiles) {
  return profiles.map((profile) => ({
    name: profile.name ?? '',
    baseUri: getProfileBaseUri(profile),
  }));
}

export function buildCombinedProfileDefinitions(profiles) {
  return profiles
    .filter((profile) => getProfileDefinition(profile))
    .map((profile) => {
      return buildSingleProfileDefinition(profile);
    })
    .join('\n\n');
}

/**
 * Returns SHACL/Turtle shapes for one selected profile. If the search result
 * already contains a definition it is reused; otherwise the exact profile is
 * fetched from the single-profile endpoint with includeDefinition enabled.
 */
export async function fetchAimsApplicationProfileDefinition({ profile, signal }) {
  const baseUri = getProfileBaseUri(profile).trim();

  if (!baseUri) {
    throw new Error('Selected metadata profile has no base URI.');
  }

  const existingDefinition = buildSingleProfileDefinition(profile);

  if (existingDefinition) {
    return {
      name: profile.name ?? 'Unnamed application profile',
      baseUri,
      shapes: existingDefinition,
    };
  }

  const swaggerResponse = await fetch(getAimsFetchUrl(AIMS_SWAGGER_URL), {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!swaggerResponse.ok) {
    throw new Error(`Unable to load AIMS Swagger specification (${swaggerResponse.status}).`);
  }

  const specification = await swaggerResponse.json();
  const profileUrl = getApplicationProfileUrl(specification, baseUri);
  const profileResponse = await fetch(getAimsFetchUrl(profileUrl), {
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!profileResponse.ok) {
    throw new Error(`Unable to load AIMS application profile (${profileResponse.status}).`);
  }

  const profileWithDefinition = await profileResponse.json();
  const returnedBaseUri = getProfileBaseUri(profileWithDefinition).trim();

  if (returnedBaseUri !== baseUri) {
    throw new Error(`AIMS returned a different profile for ${baseUri}.`);
  }

  const shapes = buildSingleProfileDefinition(profileWithDefinition);

  if (!shapes) {
    throw new Error(`AIMS returned no Turtle definition for ${baseUri}.`);
  }

  return {
    name: profileWithDefinition.name ?? profile.name ?? 'Unnamed application profile',
    baseUri,
    shapes,
  };
}
