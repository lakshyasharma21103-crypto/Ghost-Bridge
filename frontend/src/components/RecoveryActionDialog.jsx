import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from './ConfirmationDialog.jsx';
import { JsonEditor } from './JsonEditor.jsx';

const SAFE_REASON_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

function optionId(option) {
  return String(option?.policyId || option?.id || option || '');
}

function optionLabel(option) {
  if (!option || typeof option !== 'object') return String(option || '');
  return `${option.name || option.policyId || option.id}${option.version ? ` v${option.version}` : ''}`;
}

export function RecoveryActionDialog({ open, action, busy = false, onConfirm, onClose }) {
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [reasonCode, setReasonCode] = useState('OPERATOR_REQUESTED');
  const [correction, setCorrection] = useState('{}');
  const [selectionPolicyId, setSelectionPolicyId] = useState('');
  const [localError, setLocalError] = useState('');

  const selectionPolicies = useMemo(
    () => action?.selectionPolicies || action?.selectionPolicyOptions || [],
    [action],
  );

  useEffect(() => {
    if (!open || !action) return;
    setIdempotencyKey(`recovery_${crypto.randomUUID()}`);
    setReasonCode(action.requestReasonCode || action.defaultReasonCode || 'OPERATOR_REQUESTED');
    setCorrection(JSON.stringify(action.correctionTemplate || {}, null, 2));
    setSelectionPolicyId(
      action.selectionPolicyId || optionId(selectionPolicies[0]) || '',
    );
    setLocalError('');
  }, [action, open, selectionPolicies]);

  function confirm() {
    const normalizedReason = reasonCode.trim().toUpperCase();
    if (!SAFE_REASON_PATTERN.test(normalizedReason)) {
      setLocalError('Use an uppercase reason code containing letters, numbers, or underscores.');
      return;
    }

    const payload = { safeReasonCode: normalizedReason };
    if (action?.kind === 'correct_input') {
      try {
        const value = JSON.parse(correction);
        if (!value || Array.isArray(value) || typeof value !== 'object') {
          setLocalError('The correction must be a JSON object.');
          return;
        }
        payload.correction = value;
      } catch (error) {
        setLocalError(error.message || 'The correction is not valid JSON.');
        return;
      }
    }
    if (action?.kind === 'replace_agent') {
      if (!selectionPolicyId.trim()) {
        setLocalError('Choose a governed selection policy.');
        return;
      }
      payload.selectionPolicyId = selectionPolicyId.trim();
    }
    setLocalError('');
    onConfirm({ body: payload, idempotencyKey });
  }

  return (
    <ConfirmationDialog
      open={open}
      title={action?.title || 'Apply recovery action?'}
      description={action?.description}
      confirmLabel={action?.confirmLabel || 'Apply action'}
      confirmTone={action?.danger ? 'danger' : 'primary'}
      busy={busy}
      onConfirm={confirm}
      onClose={onClose}
    >
      <div className="space-y-4">
        {action?.approvalRequired ? (
          <p className="border-l-2 border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            This request will remain paused until its linked approval is resolved.
          </p>
        ) : null}
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Safe reason code</span>
          <span className="mt-1 block text-xs text-slate-500">
            A bounded code is recorded with the durable decision.
          </span>
          <input
            value={reasonCode}
            onChange={(event) => setReasonCode(event.target.value.toUpperCase())}
            maxLength={64}
            className="mt-2 w-full border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
        {action?.kind === 'correct_input' ? (
          <JsonEditor
            label="Correction JSON"
            value={correction}
            onChange={setCorrection}
            rows={8}
            hint={`Only the advertised fields are accepted: ${(action.correctableFields || []).join(', ') || 'none advertised'}.`}
          />
        ) : null}
        {action?.kind === 'replace_agent' ? (
          <label className="block">
            <span className="text-sm font-medium text-slate-800">Governed selection policy</span>
            {selectionPolicies.length ? (
              <select
                value={selectionPolicyId}
                onChange={(event) => setSelectionPolicyId(event.target.value)}
                className="mt-2 w-full border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              >
                {selectionPolicies.map((option) => (
                  <option key={optionId(option)} value={optionId(option)}>{optionLabel(option)}</option>
                ))}
              </select>
            ) : (
              <input
                value={selectionPolicyId}
                onChange={(event) => setSelectionPolicyId(event.target.value)}
                maxLength={128}
                placeholder="selection policy ID"
                className="mt-2 w-full border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            )}
          </label>
        ) : null}
        {localError ? <p className="text-sm text-rose-700" role="alert">{localError}</p> : null}
      </div>
    </ConfirmationDialog>
  );
}
