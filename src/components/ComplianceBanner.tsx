/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import React from 'react';

interface ComplianceBannerProps {
  onViewLicenses: () => void;
}

export const ComplianceBanner: React.FC<ComplianceBannerProps> = ({ onViewLicenses }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '12px',
      fontSize: '0.85rem',
      backgroundColor: '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      color: '#5f6368',
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      marginTop: 'auto'
    }}>
      <span>
        Copyright © 2026 Leonardo Cardozo Vargas
      </span>
      <span>|</span>
      <span>
        Distribuído sob a <button type="button" onClick={onViewLicenses} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', color: '#1a73e8', textDecoration: 'underline', fontWeight: 'bold' }}>GNU AGPLv3</button>
      </span>
      <span>|</span>
      <span>
        <a 
          href="https://github.com/lcv-leo/admin-app" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#1a73e8', textDecoration: 'none' }}
        >
          Código Fonte (GitHub)
        </a>
      </span>
    </div>
  );
};
