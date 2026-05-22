import { DashboardResponseSchema, type DashboardResponse } from '@apopto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { isApiClientError } from '../api/client';
import {
  createMessage,
  listThreadMessages,
  listThreads,
  messagePortalScopes,
} from '../api/messages';
import { bootstrapPortalContext } from '../api/portalBootstrap';
import { useApiClient } from '../api/useApiClient';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';
import { formatPortalChoice } from '../components/dashboard/dashboardFormatters';
import MessageThreadList from '../components/messages/MessageThreadList';
import MessageThreadView from '../components/messages/MessageThreadView';

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

export default function MessageThread() {
  const { threadId = '' } = useParams();
  const apiClient = useApiClient({ scopes: messagePortalScopes });
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
  const threadMessagesQuery = useQuery({
    enabled: dashboardQuery.data?.featureFlags.canSendMessages === true && threadId.length > 0,
    queryKey: ['messages', 'thread', threadId],
    queryFn: () => listThreadMessages(apiClient, threadId),
  });
  const replyMutation = useMutation({
    mutationFn: (input: { body: string }) => createMessage(apiClient, threadId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      await queryClient.invalidateQueries({ queryKey: ['messages', 'thread', threadId] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <LoadingState
        message="Checking your client status before opening the conversation."
        title="Loading conversation."
      />
    );
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        title="Conversation could not load."
      />
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <ErrorState
        message="The dashboard response was empty. Please refresh and try again."
        title="Conversation could not load."
      />
    );
  }

  const canSendMessages = dashboard.featureFlags.canSendMessages;

  return (
    <section className="account-page messages-page" aria-labelledby="message-thread-page-title">
      <div className="account-card dashboard-shell messages-shell">
        <p className="account-eyebrow">Client portal</p>
        <div className="dashboard-heading">
          <div>
            <h1 id="message-thread-page-title">Messages</h1>
            <p className="messages-page-lede">
              Reply with plain text or simple markdown-style notes. Raw HTML is never rendered.
            </p>
          </div>
          <span className="dashboard-status-pill">{formatPortalChoice(dashboard.client.status)}</span>
        </div>

        {!canSendMessages ? (
          <section className="account-status-panel messages-unavailable-panel">
            <span className="dashboard-panel-label">Message access</span>
            <h2>Messages are not open yet.</h2>
            <p>{unavailableMessage(dashboard)}</p>
            <Link className="account-secondary-action dashboard-card-link" to="/messages">
              Back to messages
            </Link>
          </section>
        ) : (
          <div className="messages-layout messages-layout-thread">
            <MessageThreadList
              activeThreadId={threadId}
              errorMessage={errorMessage(threadsQuery.error)}
              loading={threadsQuery.isLoading}
              threads={threadsQuery.data?.threads ?? []}
            />
            <MessageThreadView
              errorMessage={errorMessage(replyMutation.error) ?? errorMessage(threadMessagesQuery.error)}
              loading={threadMessagesQuery.isLoading}
              messages={threadMessagesQuery.data?.messages ?? []}
              onReply={replyMutation.mutateAsync}
              replying={replyMutation.isPending}
              thread={threadMessagesQuery.data?.thread}
            />
          </div>
        )}
      </div>
    </section>
  );
}
