/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { useEffect, useState } from 'react';

const getRawUrl = (file: string) => `https://raw.githubusercontent.com/lcv-leo/admin-app/main/${file}`;

export function LicencasModule() {
  const [content, setContent] = useState<{ [key: string]: string }>({
    LICENSE: 'Carregando...',
    NOTICE: 'Carregando...',
    THIRDPARTY: 'Carregando...'
  });

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const [licenseRes, noticeRes, thirdpartyRes] = await Promise.all([
          fetch(getRawUrl('LICENSE')),
          fetch(getRawUrl('NOTICE')),
          fetch(getRawUrl('THIRDPARTY.md'))
        ]);

        setContent({
          LICENSE: await licenseRes.text(),
          NOTICE: await noticeRes.text(),
          THIRDPARTY: await thirdpartyRes.text()
        });
      } catch {
        setContent({
          LICENSE: 'Erro ao carregar LICENÇA.',
          NOTICE: 'Erro ao carregar AVISOS.',
          THIRDPARTY: 'Erro ao carregar COMPONENTES DE TERCEIROS.'
        });
      }
    };

    fetchFiles();
  }, []);

  const sectionStyle = {
    marginBottom: '32px',
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  };

  const preStyle = {
    backgroundColor: '#f1f3f4',
    padding: '16px',
    borderRadius: '4px',
    overflowX: 'auto' as const,
    fontSize: '0.85rem',
    color: '#202124',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordWrap: 'break-word' as const
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 16px', fontFamily: 'var(--font-family, Inter, sans-serif)' }}>
      <h1 style={{ color: '#202124', marginBottom: '8px', fontSize: '2rem' }}>Conformidade e Licenças (Open Source Compliance)</h1>
      <p style={{ color: '#5f6368', marginBottom: '32px' }}>
        Este sistema opera sob a GNU Affero General Public License v3 (AGPLv3), garantindo a todos os usuários da rede o direito de acessar, modificar e distribuir o código-fonte.
      </p>

      <section style={sectionStyle}>
        <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #e8eaed', paddingBottom: '8px', marginBottom: '16px' }}>
          GNU AGPLv3 (LICENSE)
        </h2>
        <pre style={preStyle}>{content.LICENSE}</pre>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #e8eaed', paddingBottom: '8px', marginBottom: '16px' }}>
          Avisos de Autoria e Patentes (NOTICE)
        </h2>
        <pre style={preStyle}>{content.NOTICE}</pre>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ color: '#1a73e8', borderBottom: '2px solid #e8eaed', paddingBottom: '8px', marginBottom: '16px' }}>
          Componentes de Terceiros (THIRDPARTY)
        </h2>
        <pre style={preStyle}>{content.THIRDPARTY}</pre>
      </section>
    </div>
  );
};
