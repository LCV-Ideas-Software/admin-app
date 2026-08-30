/*
 * Copyright © 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useEffect, useState } from 'react';

const LEGAL_PUBLIC_BASE = `${import.meta.env.BASE_URL}legal/`;

const LEGAL_FILES = {
  LICENSE: `${LEGAL_PUBLIC_BASE}LICENSE.txt`,
  NOTICE: `${LEGAL_PUBLIC_BASE}NOTICE.txt`,
  THIRDPARTY: `${LEGAL_PUBLIC_BASE}THIRDPARTY.md`,
  BUNDLED_LICENSES: `${LEGAL_PUBLIC_BASE}BUNDLED-LICENSES.md`,
} as const;

type DocsState = {
  LICENSE: string;
  NOTICE: string;
  THIRDPARTY: string;
};

export function LicencasModule() {
  const [content, setContent] = useState<DocsState>({
    LICENSE: 'Carregando...',
    NOTICE: 'Carregando...',
    THIRDPARTY: 'Carregando...',
  });

  useEffect(() => {
    const fetchFile = async (label: keyof DocsState, path: string): Promise<string> => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Falha ao carregar ${label}: ${response.status}`);
      }
      return response.text();
    };

    const fetchFiles = async () => {
      try {
        const [licenseText, noticeText, thirdPartyText] = await Promise.all([
          fetchFile('LICENSE', LEGAL_FILES.LICENSE),
          fetchFile('NOTICE', LEGAL_FILES.NOTICE),
          fetchFile('THIRDPARTY', LEGAL_FILES.THIRDPARTY),
        ]);

        setContent({
          LICENSE: licenseText,
          NOTICE: noticeText,
          THIRDPARTY: thirdPartyText,
        });
      } catch {
        setContent({
          LICENSE: 'Erro ao carregar LICENSE.',
          NOTICE: 'Erro ao carregar NOTICE.',
          THIRDPARTY: 'Erro ao carregar THIRDPARTY.md.',
        });
      }
    };

    fetchFiles();
  }, []);

  const sectionStyle = {
    marginBottom: '32px',
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const paragraphStyle = {
    margin: '0 0 1rem 0',
    textAlign: 'justify' as const,
    textIndent: '2em',
    lineHeight: 1.8,
    color: '#202124',
  };

  const preStyle = {
    backgroundColor: '#f1f3f4',
    padding: '16px',
    borderRadius: '8px',
    overflowX: 'auto' as const,
    fontSize: '0.85rem',
    color: '#202124',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordWrap: 'break-word' as const,
  };

  const renderJustifiedParagraphs = (raw: string) => {
    const paragraphs = raw
      .split(/\r?\n\r?\n+/)
      .map((chunk) => chunk.replace(/\r?\n/g, ' ').trim())
      .filter(Boolean);

    return paragraphs.map((paragraph, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs derived from static split, stable order
      <p key={`paragraph-${index}`} style={paragraphStyle}>
        {paragraph}
      </p>
    ));
  };

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '32px 16px',
        fontFamily: 'var(--font-family, Inter, sans-serif)',
      }}
    >
      <h1 style={{ color: '#202124', marginBottom: '8px', fontSize: '2rem' }}>
        Conformidade e Licenças (Open Source Compliance)
      </h1>
      <p style={{ color: '#5f6368', marginBottom: '32px' }}>
        Este sistema opera sob a GNU Affero General Public License v3 (AGPLv3). Os componentes de terceiros usam
        licenças compatíveis distintas, documentadas em NOTICE, THIRDPARTY.md e no inventário de licenças gerado pelo
        build. <a href={LEGAL_FILES.BUNDLED_LICENSES}>Abrir o inventário nativo de licenças do bundle.</a>
      </p>

      <section style={sectionStyle}>
        <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #e8eaed', paddingBottom: '8px', marginBottom: '16px' }}>
          GNU AGPLv3 (LICENSE)
        </h2>
        {renderJustifiedParagraphs(content.LICENSE)}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #e8eaed', paddingBottom: '8px', marginBottom: '16px' }}>
          Avisos de Autoria e Licenciamento (NOTICE)
        </h2>
        {renderJustifiedParagraphs(content.NOTICE)}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #e8eaed', paddingBottom: '8px', marginBottom: '16px' }}>
          Componentes de Terceiros (THIRDPARTY)
        </h2>
        <pre style={preStyle}>{content.THIRDPARTY}</pre>
      </section>
    </div>
  );
}
