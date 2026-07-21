/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Sub-formulários estruturados (SRV/CAA/URI/HTTPS/SVCB) do editor de registros
 * DNS — variantes do editor inline da tabela e do formulário de criação.
 * JSX movido verbatim de CfDnsModule.tsx; cada componente só renderiza quando
 * o tipo do draft correspondente está ativo.
 */

import { Loader2, Save } from 'lucide-react';
import { type Dispatch, type SetStateAction, useState } from 'react';
import {
  type CaaValidation,
  type EditorDraft,
  type HttpsSvcbValidation,
  RECORD_TYPES,
  STRUCTURED_DATA_TYPES,
  type StructuredDataValidation,
  type UriValidation,
} from './types';
import { MAX_DNS_TAGS, validateDnsTag } from './validators';

type DraftSetter = Dispatch<SetStateAction<EditorDraft>>;

// ── DNS-1: blocos compartilhados dos editores estruturados ──────────────────

type StructuredFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  saving: boolean;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
};

function StructuredField({
  id,
  label,
  value,
  onChange,
  saving,
  type = 'text',
  min,
  max,
  step,
  placeholder,
}: StructuredFieldProps) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={saving}
      />
    </div>
  );
}

function StructuredValidationNotes({
  isProxyValidated,
  validation,
}: {
  isProxyValidated: boolean;
  validation: StructuredDataValidation;
}) {
  if (isProxyValidated) {
    return null;
  }
  return (
    <>
      {validation.issues.length > 0 && (
        <p className="field-error" role="alert">
          {validation.issues[0]}
        </p>
      )}
      {validation.hints.length > 0 && <p className="field-hint">{validation.hints[0]}</p>}
    </>
  );
}

type StructuredEditorProps = {
  idPrefix: string;
  draft: EditorDraft;
  setDraft: DraftSetter;
  saving: boolean;
  isProxyValidated: boolean;
  validation: StructuredDataValidation;
};

type InlineFieldsProps = {
  recordId: string;
  draft: EditorDraft;
  setDraft: DraftSetter;
  saving: boolean;
};

function InlineSrvFields({ recordId, draft, setDraft, saving }: InlineFieldsProps) {
  return (
    <div className="cfdns-inline-grid">
      <div className="field-group">
        <label htmlFor={`cfdns-inline-srv-service-${recordId}`}>Service</label>
        <input
          id={`cfdns-inline-srv-service-${recordId}`}
          value={draft.srvService}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              srvService: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-srv-proto-${recordId}`}>Proto</label>
        <input
          id={`cfdns-inline-srv-proto-${recordId}`}
          value={draft.srvProto}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              srvProto: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-srv-target-${recordId}`}>Target</label>
        <input
          id={`cfdns-inline-srv-target-${recordId}`}
          value={draft.srvTarget}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              srvTarget: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-srv-port-${recordId}`}>Port</label>
        <input
          id={`cfdns-inline-srv-port-${recordId}`}
          type="number"
          value={draft.srvPort}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              srvPort: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
    </div>
  );
}

function InlineCaaFields({ recordId, draft, setDraft, saving }: InlineFieldsProps) {
  return (
    <div className="cfdns-inline-grid">
      <div className="field-group">
        <label htmlFor={`cfdns-inline-caa-flags-${recordId}`}>Flags</label>
        <input
          id={`cfdns-inline-caa-flags-${recordId}`}
          type="number"
          min={0}
          max={255}
          value={draft.caaFlags}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              caaFlags: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-caa-tag-${recordId}`}>Tag</label>
        <select
          id={`cfdns-inline-caa-tag-${recordId}`}
          value={draft.caaTag}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              caaTag: event.target.value,
            }))
          }
          disabled={saving}
        >
          <option value="issue">issue</option>
          <option value="issuewild">issuewild</option>
          <option value="iodef">iodef</option>
        </select>
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-caa-value-${recordId}`}>Value</label>
        <input
          id={`cfdns-inline-caa-value-${recordId}`}
          value={draft.caaValue}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              caaValue: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
    </div>
  );
}

function InlineUriFields({ recordId, draft, setDraft, saving }: InlineFieldsProps) {
  return (
    <div className="cfdns-inline-grid">
      <div className="field-group">
        <label htmlFor={`cfdns-inline-uri-priority-${recordId}`}>URI Priority</label>
        <input
          id={`cfdns-inline-uri-priority-${recordId}`}
          type="number"
          value={draft.uriPriority}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              uriPriority: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-uri-weight-${recordId}`}>URI Weight</label>
        <input
          id={`cfdns-inline-uri-weight-${recordId}`}
          type="number"
          value={draft.uriWeight}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              uriWeight: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-uri-target-${recordId}`}>URI Target</label>
        <input
          id={`cfdns-inline-uri-target-${recordId}`}
          value={draft.uriTarget}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              uriTarget: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
    </div>
  );
}

function InlineHttpsFields({ recordId, draft, setDraft, saving }: InlineFieldsProps) {
  return (
    <div className="cfdns-inline-grid">
      <div className="field-group">
        <label htmlFor={`cfdns-inline-https-priority-${recordId}`}>{draft.type} Priority</label>
        <input
          id={`cfdns-inline-https-priority-${recordId}`}
          type="number"
          value={draft.httpsPriority}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              httpsPriority: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-https-target-${recordId}`}>{draft.type} Target</label>
        <input
          id={`cfdns-inline-https-target-${recordId}`}
          value={draft.httpsTarget}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              httpsTarget: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`cfdns-inline-https-value-${recordId}`}>{draft.type} Value</label>
        <input
          id={`cfdns-inline-https-value-${recordId}`}
          value={draft.httpsValue}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              httpsValue: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>
    </div>
  );
}

type InlineRecordEditorProps = {
  recordId: string;
  draft: EditorDraft;
  setDraft: DraftSetter;
  saving: boolean;
  selectedZoneId: string;
  isSrvDraft: boolean;
  isCaaDraft: boolean;
  isUriDraft: boolean;
  isHttpsDraft: boolean;
  isProxyValidated: boolean;
  structuredValidation: StructuredDataValidation;
  tagsSupported: boolean;
  commentMaxLength: number;
  closeRecordForm: () => void;
  handleSaveRecord: () => Promise<void>;
};

export function InlineRecordEditor({
  recordId,
  draft,
  setDraft,
  saving,
  selectedZoneId,
  isSrvDraft,
  isCaaDraft,
  isUriDraft,
  isHttpsDraft,
  isProxyValidated,
  structuredValidation,
  tagsSupported,
  commentMaxLength,
  closeRecordForm,
  handleSaveRecord,
}: InlineRecordEditorProps) {
  const inlineType = draft.type.trim().toUpperCase();
  const isStructuredDataDraft = STRUCTURED_DATA_TYPES.includes(inlineType);

  return (
    <tr className="cfdns-inline-editor-row">
      {/* 8 colunas: seleção em lote (DNS-2) + as 7 colunas de dados/ações. */}
      <td colSpan={8}>
        <div className="cfdns-inline-editor">
          <div className="cfdns-inline-editor__header">
            <strong>
              Editar registro {draft.type} {draft.name}
            </strong>
            <div className="cfdns-row-actions">
              <button
                type="button"
                className="ghost-button cfrow-action-btn"
                onClick={closeRecordForm}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button cfrow-action-btn"
                onClick={() => void handleSaveRecord()}
                disabled={saving || !selectedZoneId}
              >
                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                Salvar
              </button>
            </div>
          </div>

          <div className="cfdns-inline-grid">
            <div className="field-group">
              <label htmlFor={`cfdns-inline-type-${recordId}`}>Tipo</label>
              <select
                id={`cfdns-inline-type-${recordId}`}
                value={draft.type}
                onChange={(event) => {
                  const nextType = event.target.value.toUpperCase();
                  setDraft((current) => ({
                    ...current,
                    type: nextType,
                    proxied: current.proxied,
                  }));
                }}
                disabled={saving}
              >
                {RECORD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label htmlFor={`cfdns-inline-name-${recordId}`}>Nome</label>
              <input
                id={`cfdns-inline-name-${recordId}`}
                type="text"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value.toLowerCase(),
                  }))
                }
                disabled={saving}
              />
            </div>

            <div className="field-group">
              <label htmlFor={`cfdns-inline-ttl-${recordId}`}>TTL</label>
              <input
                id={`cfdns-inline-ttl-${recordId}`}
                type="number"
                min={1}
                max={86400}
                value={draft.ttl}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ttl: event.target.value,
                  }))
                }
                disabled={saving}
              />
            </div>

            {!isSrvDraft && (
              <div className="field-group">
                <label htmlFor={`cfdns-inline-priority-${recordId}`}>Priority</label>
                <input
                  id={`cfdns-inline-priority-${recordId}`}
                  type="number"
                  min={0}
                  max={65535}
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                  disabled={saving}
                />
              </div>
            )}
          </div>

          {!isSrvDraft && !isCaaDraft && !isUriDraft && !isHttpsDraft && !isStructuredDataDraft && (
            <div className="field-group">
              <label htmlFor={`cfdns-inline-content-${recordId}`}>Conteúdo</label>
              <textarea
                id={`cfdns-inline-content-${recordId}`}
                className="json-textarea"
                rows={3}
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                disabled={saving}
              />
            </div>
          )}

          {isSrvDraft && <InlineSrvFields recordId={recordId} draft={draft} setDraft={setDraft} saving={saving} />}

          {isCaaDraft && <InlineCaaFields recordId={recordId} draft={draft} setDraft={setDraft} saving={saving} />}

          {isUriDraft && <InlineUriFields recordId={recordId} draft={draft} setDraft={setDraft} saving={saving} />}

          {isHttpsDraft && <InlineHttpsFields recordId={recordId} draft={draft} setDraft={setDraft} saving={saving} />}

          {inlineType === 'DS' && (
            <DsDraftFields
              idPrefix={`cfdns-inline-ds-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {inlineType === 'DNSKEY' && (
            <DnskeyDraftFields
              idPrefix={`cfdns-inline-dnskey-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {inlineType === 'SSHFP' && (
            <SshfpDraftFields
              idPrefix={`cfdns-inline-sshfp-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {(inlineType === 'SMIMEA' || inlineType === 'TLSA') && (
            <TlsaDraftFields
              idPrefix={`cfdns-inline-tlsa-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {inlineType === 'CERT' && (
            <CertDraftFields
              idPrefix={`cfdns-inline-cert-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {inlineType === 'LOC' && (
            <LocDraftFields
              idPrefix={`cfdns-inline-loc-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          {inlineType === 'NAPTR' && (
            <NaptrDraftFields
              idPrefix={`cfdns-inline-naptr-${recordId}`}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              isProxyValidated={isProxyValidated}
              validation={structuredValidation}
            />
          )}

          <div className="cfdns-inline-grid">
            <div className="field-group">
              <label htmlFor={`cfdns-inline-comment-${recordId}`}>Comentário</label>
              <input
                id={`cfdns-inline-comment-${recordId}`}
                type="text"
                maxLength={commentMaxLength}
                value={draft.comment}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    comment: event.target.value,
                  }))
                }
                disabled={saving}
              />
              <p className="field-hint">
                {draft.comment.length}/{commentMaxLength}
              </p>
            </div>
            <div className="field-group">
              <label htmlFor={`cfdns-inline-proxy-${recordId}`}>Proxy</label>
              <select
                id={`cfdns-inline-proxy-${recordId}`}
                value={draft.proxied ? 'true' : 'false'}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    proxied: event.target.value === 'true',
                  }))
                }
                disabled={saving}
              >
                <option value="false">DNS only</option>
                <option value="true">Proxied</option>
              </select>
            </div>
          </div>

          <TagsInput
            idPrefix={`cfdns-inline-${recordId}`}
            tags={draft.tags}
            onTagsChange={(tags) => setDraft((current) => ({ ...current, tags }))}
            disabled={saving}
            tagsSupported={tagsSupported}
          />

          {draft.proxied ? (
            <p className="field-hint">
              Proxy laranja ativo: este registro passa a ser tratado como operacionalmente correto pelo painel, sem
              bloqueio por validação semântica.
            </p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

type DraftSectionProps = {
  draft: EditorDraft;
  setDraft: DraftSetter;
  saving: boolean;
};

export function SrvDraftFields({ draft, setDraft, saving }: DraftSectionProps) {
  return (
    <>
      <div className="field-group">
        <label htmlFor="cfdns-srv-service">SRV Service</label>
        <input
          id="cfdns-srv-service"
          name="cfDnsSrvService"
          type="text"
          autoComplete="off"
          placeholder="_sip"
          value={draft.srvService}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              srvService: event.target.value,
            }))
          }
          disabled={saving}
        />
      </div>

      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="cfdns-srv-proto">SRV Proto</label>
          <input
            id="cfdns-srv-proto"
            name="cfDnsSrvProto"
            type="text"
            autoComplete="off"
            placeholder="_tcp"
            value={draft.srvProto}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                srvProto: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfdns-srv-name">SRV Name</label>
          <input
            id="cfdns-srv-name"
            name="cfDnsSrvName"
            type="text"
            autoComplete="off"
            placeholder="example.com"
            value={draft.srvName}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                srvName: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="cfdns-srv-priority">SRV Priority</label>
          <input
            id="cfdns-srv-priority"
            name="cfDnsSrvPriority"
            type="number"
            min={0}
            max={65535}
            value={draft.srvPriority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                srvPriority: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfdns-srv-weight">SRV Weight</label>
          <input
            id="cfdns-srv-weight"
            name="cfDnsSrvWeight"
            type="number"
            min={0}
            max={65535}
            value={draft.srvWeight}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                srvWeight: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>
      </div>

      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="cfdns-srv-port">SRV Port</label>
          <input
            id="cfdns-srv-port"
            name="cfDnsSrvPort"
            type="number"
            min={1}
            max={65535}
            value={draft.srvPort}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                srvPort: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfdns-srv-target">SRV Target</label>
          <input
            id="cfdns-srv-target"
            name="cfDnsSrvTarget"
            type="text"
            autoComplete="off"
            placeholder="sip.example.com"
            value={draft.srvTarget}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                srvTarget: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>
      </div>
    </>
  );
}

type CaaDraftSectionProps = DraftSectionProps & {
  isProxyValidated: boolean;
  caaValidation: CaaValidation;
};

export function CaaDraftFields({ draft, setDraft, saving, isProxyValidated, caaValidation }: CaaDraftSectionProps) {
  return (
    <>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="cfdns-caa-flags">CAA Flags</label>
          <input
            id="cfdns-caa-flags"
            name="cfDnsCaaFlags"
            type="number"
            min={0}
            max={255}
            value={draft.caaFlags}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                caaFlags: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfdns-caa-tag">CAA Tag</label>
          <select
            id="cfdns-caa-tag"
            name="cfDnsCaaTag"
            value={draft.caaTag}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                caaTag: event.target.value,
              }))
            }
            disabled={saving}
          >
            <option value="issue">issue</option>
            <option value="issuewild">issuewild</option>
            <option value="iodef">iodef</option>
          </select>
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="cfdns-caa-value">CAA Value</label>
        <input
          id="cfdns-caa-value"
          name="cfDnsCaaValue"
          type="text"
          autoComplete="off"
          placeholder="letsencrypt.org"
          value={draft.caaValue}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              caaValue: event.target.value,
            }))
          }
          disabled={saving}
        />
        {!isProxyValidated && caaValidation.issues.length > 0 && (
          <p className="field-error" role="alert">
            {caaValidation.issues[0]}
          </p>
        )}
        {!isProxyValidated && caaValidation.hints.length > 0 && <p className="field-hint">{caaValidation.hints[0]}</p>}
      </div>
    </>
  );
}

type UriDraftSectionProps = DraftSectionProps & {
  isProxyValidated: boolean;
  uriValidation: UriValidation;
};

export function UriDraftFields({ draft, setDraft, saving, isProxyValidated, uriValidation }: UriDraftSectionProps) {
  return (
    <>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="cfdns-uri-priority">URI Priority</label>
          <input
            id="cfdns-uri-priority"
            name="cfDnsUriPriority"
            type="number"
            min={0}
            max={65535}
            value={draft.uriPriority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                uriPriority: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfdns-uri-weight">URI Weight</label>
          <input
            id="cfdns-uri-weight"
            name="cfDnsUriWeight"
            type="number"
            min={0}
            max={65535}
            value={draft.uriWeight}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                uriWeight: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="cfdns-uri-target">URI Target</label>
        <input
          id="cfdns-uri-target"
          name="cfDnsUriTarget"
          type="text"
          autoComplete="off"
          placeholder="https://api.exemplo.com/.well-known"
          value={draft.uriTarget}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              uriTarget: event.target.value,
            }))
          }
          disabled={saving}
        />
        {!isProxyValidated && uriValidation.issues.length > 0 && (
          <p className="field-error" role="alert">
            {uriValidation.issues[0]}
          </p>
        )}
        {!isProxyValidated && uriValidation.hints.length > 0 && <p className="field-hint">{uriValidation.hints[0]}</p>}
      </div>
    </>
  );
}

type HttpsDraftSectionProps = DraftSectionProps & {
  isProxyValidated: boolean;
  httpsValidation: HttpsSvcbValidation;
};

export function HttpsDraftFields({
  draft,
  setDraft,
  saving,
  isProxyValidated,
  httpsValidation,
}: HttpsDraftSectionProps) {
  return (
    <>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="cfdns-https-priority">{draft.type} Priority</label>
          <input
            id="cfdns-https-priority"
            name="cfDnsHttpsPriority"
            type="number"
            min={0}
            max={65535}
            value={draft.httpsPriority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                httpsPriority: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>

        <div className="field-group">
          <label htmlFor="cfdns-https-target">{draft.type} Target</label>
          <input
            id="cfdns-https-target"
            name="cfDnsHttpsTarget"
            type="text"
            autoComplete="off"
            placeholder="."
            value={draft.httpsTarget}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                httpsTarget: event.target.value,
              }))
            }
            disabled={saving}
          />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="cfdns-https-value">{draft.type} Value</label>
        <input
          id="cfdns-https-value"
          name="cfDnsHttpsValue"
          type="text"
          autoComplete="off"
          placeholder="alpn=h3,h2 port=443 ipv4hint=203.0.113.10"
          value={draft.httpsValue}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              httpsValue: event.target.value,
            }))
          }
          disabled={saving}
        />
        {!isProxyValidated && httpsValidation.issues.length > 0 && (
          <p className="field-error" role="alert">
            {httpsValidation.issues[0]}
          </p>
        )}
        {!isProxyValidated && httpsValidation.hints.length > 0 && (
          <p className="field-hint">{httpsValidation.hints[0]}</p>
        )}
        {!isProxyValidated && httpsValidation.tokens.length > 0 && (
          <p className="field-hint">Tokens parseados: {httpsValidation.tokens.join(' | ')}</p>
        )}
      </div>
    </>
  );
}

// ── DNS-1: editores estruturados DS/DNSKEY/SSHFP/SMIMEA/TLSA/CERT/LOC/NAPTR ──
// Cada editor serve tanto o formulário de criação quanto o editor inline da
// tabela — o idPrefix diferencia os ids dos campos entre os dois contextos.

export function DsDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-key-tag`}
          label="DS Key Tag"
          type="number"
          min={0}
          max={65535}
          value={draft.dsKeyTag}
          onChange={(value) => setDraft((current) => ({ ...current, dsKeyTag: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-algorithm`}
          label="DS Algorithm"
          type="number"
          min={0}
          max={255}
          value={draft.dsAlgorithm}
          onChange={(value) => setDraft((current) => ({ ...current, dsAlgorithm: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-digest-type`}
          label="DS Digest Type"
          type="number"
          min={0}
          max={255}
          value={draft.dsDigestType}
          onChange={(value) => setDraft((current) => ({ ...current, dsDigestType: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-digest`}
          label="DS Digest (hex)"
          placeholder="ex.: 436c6f7564666c617265"
          value={draft.dsDigest}
          onChange={(value) => setDraft((current) => ({ ...current, dsDigest: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

export function DnskeyDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-flags`}
          label="DNSKEY Flags"
          type="number"
          min={0}
          max={65535}
          value={draft.dnskeyFlags}
          onChange={(value) => setDraft((current) => ({ ...current, dnskeyFlags: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-protocol`}
          label="DNSKEY Protocol"
          type="number"
          min={0}
          max={255}
          value={draft.dnskeyProtocol}
          onChange={(value) => setDraft((current) => ({ ...current, dnskeyProtocol: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-algorithm`}
          label="DNSKEY Algorithm"
          type="number"
          min={0}
          max={255}
          value={draft.dnskeyAlgorithm}
          onChange={(value) => setDraft((current) => ({ ...current, dnskeyAlgorithm: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-public-key`}
          label="DNSKEY Public Key"
          placeholder="chave pública em base64"
          value={draft.dnskeyPublicKey}
          onChange={(value) => setDraft((current) => ({ ...current, dnskeyPublicKey: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

export function SshfpDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-algorithm`}
          label="SSHFP Algorithm"
          type="number"
          min={0}
          max={255}
          value={draft.sshfpAlgorithm}
          onChange={(value) => setDraft((current) => ({ ...current, sshfpAlgorithm: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-type`}
          label="SSHFP Type"
          type="number"
          min={0}
          max={255}
          value={draft.sshfpType}
          onChange={(value) => setDraft((current) => ({ ...current, sshfpType: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-fingerprint`}
          label="SSHFP Fingerprint (hex)"
          placeholder="ex.: aa38104b0b9b20b8..."
          value={draft.sshfpFingerprint}
          onChange={(value) => setDraft((current) => ({ ...current, sshfpFingerprint: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

/** SMIMEA e TLSA compartilham o mesmo shape (usage/selector/matching_type/certificate). */
export function TlsaDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  const label = draft.type.trim().toUpperCase() || 'TLSA';
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-usage`}
          label={`${label} Usage`}
          type="number"
          min={0}
          max={255}
          value={draft.tlsaUsage}
          onChange={(value) => setDraft((current) => ({ ...current, tlsaUsage: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-selector`}
          label={`${label} Selector`}
          type="number"
          min={0}
          max={255}
          value={draft.tlsaSelector}
          onChange={(value) => setDraft((current) => ({ ...current, tlsaSelector: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-matching-type`}
          label={`${label} Matching Type`}
          type="number"
          min={0}
          max={255}
          value={draft.tlsaMatchingType}
          onChange={(value) => setDraft((current) => ({ ...current, tlsaMatchingType: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-certificate`}
          label={`${label} Certificate`}
          placeholder="hash/certificado em hex"
          value={draft.tlsaCertificate}
          onChange={(value) => setDraft((current) => ({ ...current, tlsaCertificate: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

export function CertDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-type`}
          label="CERT Type"
          type="number"
          min={0}
          max={65535}
          value={draft.certType}
          onChange={(value) => setDraft((current) => ({ ...current, certType: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-key-tag`}
          label="CERT Key Tag"
          type="number"
          min={0}
          max={65535}
          value={draft.certKeyTag}
          onChange={(value) => setDraft((current) => ({ ...current, certKeyTag: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-algorithm`}
          label="CERT Algorithm"
          type="number"
          min={0}
          max={255}
          value={draft.certAlgorithm}
          onChange={(value) => setDraft((current) => ({ ...current, certAlgorithm: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-certificate`}
          label="CERT Certificate"
          placeholder="certificado em base64"
          value={draft.certCertificate}
          onChange={(value) => setDraft((current) => ({ ...current, certCertificate: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

export function LocDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-lat-degrees`}
          label="LOC Lat Degrees (0-90)"
          type="number"
          min={0}
          max={90}
          value={draft.locLatDegrees}
          onChange={(value) => setDraft((current) => ({ ...current, locLatDegrees: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-lat-minutes`}
          label="LOC Lat Minutes (0-59)"
          type="number"
          min={0}
          max={59}
          value={draft.locLatMinutes}
          onChange={(value) => setDraft((current) => ({ ...current, locLatMinutes: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-lat-seconds`}
          label="LOC Lat Seconds (0-59.999)"
          type="number"
          min={0}
          max={59.999}
          step="0.001"
          value={draft.locLatSeconds}
          onChange={(value) => setDraft((current) => ({ ...current, locLatSeconds: value }))}
          saving={saving}
        />
        <div className="field-group">
          <label htmlFor={`${idPrefix}-lat-direction`}>LOC Lat Direction</label>
          <select
            id={`${idPrefix}-lat-direction`}
            value={draft.locLatDirection}
            onChange={(event) => setDraft((current) => ({ ...current, locLatDirection: event.target.value }))}
            disabled={saving}
          >
            <option value="N">N (Norte)</option>
            <option value="S">S (Sul)</option>
          </select>
        </div>
        <StructuredField
          id={`${idPrefix}-long-degrees`}
          label="LOC Long Degrees (0-180)"
          type="number"
          min={0}
          max={180}
          value={draft.locLongDegrees}
          onChange={(value) => setDraft((current) => ({ ...current, locLongDegrees: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-long-minutes`}
          label="LOC Long Minutes (0-59)"
          type="number"
          min={0}
          max={59}
          value={draft.locLongMinutes}
          onChange={(value) => setDraft((current) => ({ ...current, locLongMinutes: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-long-seconds`}
          label="LOC Long Seconds (0-59.999)"
          type="number"
          min={0}
          max={59.999}
          step="0.001"
          value={draft.locLongSeconds}
          onChange={(value) => setDraft((current) => ({ ...current, locLongSeconds: value }))}
          saving={saving}
        />
        <div className="field-group">
          <label htmlFor={`${idPrefix}-long-direction`}>LOC Long Direction</label>
          <select
            id={`${idPrefix}-long-direction`}
            value={draft.locLongDirection}
            onChange={(event) => setDraft((current) => ({ ...current, locLongDirection: event.target.value }))}
            disabled={saving}
          >
            <option value="E">E (Leste)</option>
            <option value="W">W (Oeste)</option>
          </select>
        </div>
        <StructuredField
          id={`${idPrefix}-altitude`}
          label="LOC Altitude (m)"
          type="number"
          min={-100000}
          max={42849672.95}
          step="0.01"
          value={draft.locAltitude}
          onChange={(value) => setDraft((current) => ({ ...current, locAltitude: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-size`}
          label="LOC Size (m)"
          type="number"
          min={0}
          max={90000000}
          step="0.01"
          value={draft.locSize}
          onChange={(value) => setDraft((current) => ({ ...current, locSize: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-precision-horz`}
          label="LOC Precision Horz (m)"
          type="number"
          min={0}
          max={90000000}
          step="0.01"
          value={draft.locPrecisionHorz}
          onChange={(value) => setDraft((current) => ({ ...current, locPrecisionHorz: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-precision-vert`}
          label="LOC Precision Vert (m)"
          type="number"
          min={0}
          max={90000000}
          step="0.01"
          value={draft.locPrecisionVert}
          onChange={(value) => setDraft((current) => ({ ...current, locPrecisionVert: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

export function NaptrDraftFields({
  idPrefix,
  draft,
  setDraft,
  saving,
  isProxyValidated,
  validation,
}: StructuredEditorProps) {
  return (
    <>
      <div className="cfdns-inline-grid">
        <StructuredField
          id={`${idPrefix}-order`}
          label="NAPTR Order"
          type="number"
          min={0}
          max={65535}
          value={draft.naptrOrder}
          onChange={(value) => setDraft((current) => ({ ...current, naptrOrder: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-preference`}
          label="NAPTR Preference"
          type="number"
          min={0}
          max={65535}
          value={draft.naptrPreference}
          onChange={(value) => setDraft((current) => ({ ...current, naptrPreference: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-flags`}
          label="NAPTR Flags"
          placeholder="ex.: S, A, U, P"
          value={draft.naptrFlags}
          onChange={(value) => setDraft((current) => ({ ...current, naptrFlags: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-service`}
          label="NAPTR Service"
          placeholder="ex.: SIP+D2U"
          value={draft.naptrService}
          onChange={(value) => setDraft((current) => ({ ...current, naptrService: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-regex`}
          label="NAPTR Regex"
          placeholder="ex.: !^.*$!sip:info@exemplo.com!"
          value={draft.naptrRegex}
          onChange={(value) => setDraft((current) => ({ ...current, naptrRegex: value }))}
          saving={saving}
        />
        <StructuredField
          id={`${idPrefix}-replacement`}
          label="NAPTR Replacement"
          placeholder="."
          value={draft.naptrReplacement}
          onChange={(value) => setDraft((current) => ({ ...current, naptrReplacement: value }))}
          saving={saving}
        />
      </div>
      <StructuredValidationNotes isProxyValidated={isProxyValidated} validation={validation} />
    </>
  );
}

// ── DNS-1: input de tags em chips (Enter adiciona, × remove) ────────────────

type TagsInputProps = {
  idPrefix: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled: boolean;
  tagsSupported: boolean;
};

export function TagsInput({ idPrefix, tags, onTagsChange, disabled, tagsSupported }: TagsInputProps) {
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');

  const addTag = () => {
    const candidate = tagInput.trim();
    if (!candidate) {
      return;
    }
    const formatError = validateDnsTag(candidate);
    if (formatError) {
      setTagError(formatError);
      return;
    }
    if (tags.includes(candidate)) {
      setTagError(`Tag "${candidate}" já adicionada.`);
      return;
    }
    if (tags.length >= MAX_DNS_TAGS) {
      setTagError(`Máximo de ${MAX_DNS_TAGS} tags por registro DNS.`);
      return;
    }
    onTagsChange([...tags, candidate]);
    setTagInput('');
    setTagError('');
  };

  return (
    <div className="field-group">
      <label htmlFor={`${idPrefix}-tags`}>Tags</label>
      <div className="cfdns-tags-input">
        {tags.map((tag) => (
          <span key={tag} className="cfdns-tag-chip">
            {tag}
            <button
              type="button"
              aria-label={`Remover tag ${tag}`}
              onClick={() => onTagsChange(tags.filter((item) => item !== tag))}
              disabled={disabled}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={`${idPrefix}-tags`}
          type="text"
          autoComplete="off"
          placeholder={tagsSupported ? 'nome ou nome:valor + Enter' : 'Indisponível no plano atual'}
          title={tagsSupported ? undefined : 'Tags exigem plano pago na Cloudflare'}
          value={tagInput}
          onChange={(event) => {
            setTagInput(event.target.value);
            if (tagError) {
              setTagError('');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTag();
            }
          }}
          disabled={disabled || !tagsSupported}
        />
      </div>
      {!tagsSupported && <p className="field-hint">Tags exigem plano pago na Cloudflare.</p>}
      {tagError && (
        <p className="field-error" role="alert">
          {tagError}
        </p>
      )}
    </div>
  );
}
