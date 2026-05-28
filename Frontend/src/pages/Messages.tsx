import { DashboardResponseSchema, type DashboardResponse } from '@apopto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isApiClientError } from '../api/client';
import {
  createThread,
  listThreads,
  messagePortalScopes,
} from '../api/messages';
import { bootstrapPortalContext } from '../api/portalBootstrap';
import { useApiClient } from '../api/useApiClient';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';
import { formatPortalChoice } from '../components/dashboard/dashboardFormatters';
import MessageThreadList from '../components/messages/MessageThreadList';
import NewThreadForm from '../components/messages/NewThreadForm';

function errorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  return error instanceof Error ? error.message : undefined;
}

function unavailableMessage(dashboard: DashboardResponse) {
  if (dashboard.client.status === 'lead') {
    return 'Messages open after the initial intake has been submitted.';
  }

  return 'Messages are not available for this client status yet.';
}

export default function Messages() {
  const apiClient = useApiClient({ scopes: messagePortalScopes });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      await bootstrapPortalContext(apiClient);

      return DashboardResponseSchema.parse(await apiClient.get('/api/dashboard'));
    },
  });
  const threadsQuery = useQuery({
    enabled: dashboardQuery.data?.featureFlags.canSendMessages === true,
    queryKey: ['messages', 'threads'],
    queryFn: () => listThreads(apiClient),
  });
  const createThreadMutation = useMutation({
    mutationFn: (input: { body: string; subject: string }) => createThread(apiClient, input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/messages/${encodeURIComponent(response.thread.threadId)}`);
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <LoadingState
        message="Checking your client status before opening messages."
        title="Loading messages."
      />
    );
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        title="Messages could not load."
      />
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <ErrorState
        message="The dashboard response was empty. Please refresh and try again."
        title="Messages could not load."
      />
    );
  }

  const canSendMessages = dashboard.featureFlags.canSendMessages;

  return (
    <section className="account-page messages-page" aria-labelledby="messages-title">
      <div className="account-card dashboard-shell messages-shell portal-page-shell">
        <div className="portal-page-header dashboard-heading">
          <div>
            <p className="account-eyebrow">Client portal</p>
            <h1 id="messages-title">Messages</h1>
            <p className="messages-page-lede">
              Keep project questions, decisions, and next steps in one protected place.
            </p>
          </div>
          <span className="dashboard-status-pill">{formatPortalChoice(dashboard.client.status)}</span>
        </div>

        {!canSendMessages ? (
          <section className="account-status-panel messages-unavailable-panel">
            <span className="dashboard-panel-label">Message access</span>
            <h2>Messages are not open yet.</h2>
            <p>{unavailableMessage(dashboard)}</p>
          </section>
        ) : (
          <div className="portal-workspace-two-column messages-layout">
            <div className="portal-workspace-scroll">
              <MessageThreadList
                errorMessage={errorMessage(threadsQuery.error)}
                loading={threadsQuery.isLoading}
                threads={threadsQuery.data?.threads ?? []}
              />
            </div>
            <div className="portal-workspace-scroll">
              <NewThreadForm
                errorMessage={errorMessage(createThreadMutation.error)}
                onCreate={createThreadMutation.mutateAsync}
                saving={createThreadMutation.isPending}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
