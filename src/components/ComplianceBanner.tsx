/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import React from 'react';

interface ComplianceBannerProps {
  onViewLicenses: () => void;
}

export const ComplianceBanner: React.FC<ComplianceBannerProps> = ({ onViewLicenses }) => {
  const linkStyle: React.CSSProperties = {
    color: 'var(--color-primary, #1a73e8)',
    textDecoration: 'underline',
    fontWeight: 700
  };

  return (
    <footer
      style={{
        textAlign: 'center',
        padding: '12px 16px',
        fontSize: '0.85rem',
        borderTop: '1px solid var(--border-color, rgba(0,0,0,0.12))',
        color: 'var(--text-secondary, #5f6368)',
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginTop: 'auto',
        background: 'var(--surface, rgba(255,255,255,0.82))',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
      aria-label="Rodapé de conformidade de licenciamento"
    >
      <span>Copyright © 2026 Leonardo Cardozo Vargas</span>
      <span aria-hidden="true">|</span>
      <a
        href="/licencas"
        onClick={(event) => {
          event.preventDefault();
          onViewLicenses();
        }}
        style={linkStyle}
      >
        Licenças (GNU AGPLv3 + Apache 2.0)
      </a>
      <span aria-hidden="true">|</span>
      <a href="https://github.com/lcv-leo/admin-app" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        Código Fonte (GitHub)
      </a>
    </footer>
  );
};
