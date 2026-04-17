/*
 * Copyright (C) 2026 Leonardo Cardozo Vargas
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { SyncStatusCard } from './SyncStatusCard';
import { NotificationProvider } from './Notification';
import type { ReactNode } from 'react';

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    );
  };
}

const defaultProps = {
  module: 'mainsite' as const,
  endpoint: '/api/mainsite/sync' as const,
  title: 'MainSite Sync',
  description: 'Sincroniza dados do MainSite',
};

const mockOverviewResponse = {
  ok: true,
  sync: [
    {
      module: 'mainsite',
      totalRuns: 10,
      successRuns: 9,
      errorRuns: 1,
      lastStatus: 'success',
      lastFinishedAt: 1704067200000,
    },
  ],
};

describe('SyncStatusCard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('shows loading state before data arrives', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<SyncStatusCard {...defaultProps} />, { wrapper: makeWrapper() });
    expect(screen.getByText('Carregando status operacional do sync...')).toBeInTheDocument();
  });

  it('disables sync button while loading', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<SyncStatusCard {...defaultProps} />, { wrapper: makeWrapper() });
    const button = screen.getAllByTestId('sync-trigger-mainsite').at(-1)!;
    expect(button).toBeDisabled();
  });

  it('renders title and description', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<SyncStatusCard {...defaultProps} />, { wrapper: makeWrapper() });
    const card = screen.getAllByTestId('sync-card-mainsite').at(-1)!;
    expect(within(card).getByText('MainSite Sync')).toBeInTheDocument();
    expect(within(card).getByText('Sincroniza dados do MainSite')).toBeInTheDocument();
  });

  it('displays sync stats after successful fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOverviewResponse,
    });
    render(<SyncStatusCard {...defaultProps} />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('último sync OK')).toBeInTheDocument();
  });

  it('enables sync button after data loads', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOverviewResponse,
    });
    render(<SyncStatusCard {...defaultProps} />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getAllByTestId('sync-trigger-mainsite').at(-1)!).toBeEnabled());
  });

  it('calls the sync endpoint when button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockOverviewResponse })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, recordsRead: 5, recordsUpserted: 3 }),
      })
      .mockResolvedValue({ ok: true, json: async () => mockOverviewResponse });

    const user = userEvent.setup();
    render(<SyncStatusCard {...defaultProps} />, { wrapper: makeWrapper() });
    await waitFor(() => expect(screen.getAllByTestId('sync-trigger-mainsite').at(-1)!).toBeEnabled());

    await user.click(screen.getAllByTestId('sync-trigger-mainsite').at(-1)!);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/mainsite/sync', { method: 'POST' }));
  });
});
