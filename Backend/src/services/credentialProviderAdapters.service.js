const adapters = new Map();

function adapterKey(provider, credentialType) {
  return `${String(provider || '').toLowerCase()}\0${String(credentialType || '').toLowerCase()}`;
}

function registerCredentialProviderAdapter(provider, credentialType, adapter) {
  if (!adapter || typeof adapter !== 'object')
    throw new TypeError('Credential adapter is required.');
  adapters.set(adapterKey(provider, credentialType), Object.freeze({ ...adapter }));
}

function credentialProviderAdapter(provider, credentialType) {
  return adapters.get(adapterKey(provider, credentialType));
}

async function validateCredential({ provider, credentialType, payload, context = {} }) {
  const adapter = credentialProviderAdapter(provider, credentialType);
  if (adapter?.validateProviderCredential) {
    return adapter.validateProviderCredential({ payload, context });
  }
  // Structural validation is sufficient for activation, but it never claims provider health.
  return {
    validationStatus: 'VALIDATED',
    validationMethod: 'LOCAL_FORMAT',
    healthStatus: 'UNKNOWN',
    reasonCode: 'PROVIDER_VALIDATION_NOT_SUPPORTED',
  };
}

async function providerManagedRotation(input) {
  const adapter = credentialProviderAdapter(input.provider, input.credentialType);
  if (
    !adapter?.prepareRotation ||
    !adapter?.createProviderCredential ||
    !adapter?.validateProviderCredential
  ) {
    return { supported: false, reasonCode: 'PROVIDER_ROTATION_NOT_SUPPORTED' };
  }
  return { supported: true, adapter };
}

module.exports = {
  credentialProviderAdapter,
  providerManagedRotation,
  registerCredentialProviderAdapter,
  validateCredential,
};
