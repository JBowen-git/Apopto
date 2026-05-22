import {
  DashboardResponseSchema,
  type DashboardResponse,
  type FileCategory,
} from '@apopto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { bootstrapPortalContext } from '../api/portalBootstrap';
import { isApiClientError } from '../api/client';
import {
  completeUpload,
  createUploadUrl,
  deleteClientFile,
  filePortalScopes,
  getDownloadUrl,
  listClientFiles,
  putFileDirectlyToS3,
} from '../api/files';
import { useApiClient } from '../api/useApiClient';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';
import { formatPortalChoice } from '../components/dashboard/dashboardFormatters';
import FileGuidancePanel from '../components/files/FileGuidancePanel';
import FileList from '../components/files/FileList';
import FileUploadPanel from '../components/files/FileUploadPanel';

function errorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  return error instanceof Error ? error.message : undefined;
}

function unavailableMessage(dashboard: DashboardResponse) {
  if (dashboard.client.status === 'archived') {
    return 'This client portal is archived. Files remain read-only when available.';
  }

  return 'File uploads become available when your client status is active or maintenance.';
}

export default function Files() {
  const apiClient = useApiClient({ scopes: filePortalScopes });
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      await bootstrapPortalContext(apiClient);

      return DashboardResponseSchema.parse(await apiClient.get('/api/dashboard'));
    },
  });
  const filesQuery = useQuery({
    enabled: dashboardQuery.data?.featureFlags.canUploadFiles === true
      || dashboardQuery.data?.featureFlags.canViewProjects === true,
    queryKey: ['files'],
    queryFn: () => listClientFiles(apiClient),
  });
  const uploadMutation = useMutation({
    mutationFn: async ({
      category,
      file,
      projectId,
    }: {
      category: FileCategory;
      file: File;
      projectId?: string;
    }) => {
      const upload = await createUploadUrl(apiClient, {
        category,
        mimeType: file.type || 'application/octet-stream',
        originalFilename: file.name,
        ...(projectId ? { projectId } : {}),
        sizeBytes: file.size,
      });

      await putFileDirectlyToS3(file, upload);

      return completeUpload(apiClient, upload.fileId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['files'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const downloadMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await getDownloadUrl(apiClient, fileId);

      window.location.assign(response.url);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => deleteClientFile(apiClient, fileId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['files'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <LoadingState
        message="Checking your client status before opening file tools."
        title="Loading files."
      />
    );
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        title="Files could not load."
      />
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <ErrorState
        message="The dashboard response was empty. Please refresh and try again."
        title="Files could not load."
      />
    );
  }

  const canUseFiles = dashboard.featureFlags.canUploadFiles;
  const canListFiles = canUseFiles || dashboard.featureFlags.canViewProjects;

  return (
    <section className="account-page files-page" aria-labelledby="files-title">
      <div className="account-card dashboard-shell files-shell">
        <p className="account-eyebrow">Client portal</p>
        <div className="dashboard-heading">
          <div>
            <h1 id="files-title">Files</h1>
            <p className="files-page-lede">
              Share project assets safely without routing file bytes through the API.
            </p>
          </div>
          <span className="dashboard-status-pill">{formatPortalChoice(dashboard.client.status)}</span>
        </div>

        <div className="files-layout">
          <FileGuidancePanel />
          {canUseFiles ? (
            <FileUploadPanel
              errorMessage={errorMessage(uploadMutation.error)}
              onUpload={uploadMutation.mutateAsync}
              projects={dashboard.projects}
              statusMessage={uploadMutation.isPending
                ? 'Uploading directly to S3, then confirming the file metadata.'
                : undefined}
              uploading={uploadMutation.isPending}
            />
          ) : (
            <section className="account-status-panel files-unavailable-panel">
              <span className="dashboard-panel-label">File access</span>
              <h2>Uploads are not open for this status.</h2>
              <p>{unavailableMessage(dashboard)}</p>
              <Link className="account-secondary-action dashboard-card-link" to="/dashboard">
                Back to dashboard
              </Link>
            </section>
          )}
        </div>

        {canListFiles ? (
          <FileList
            deletingFileId={deleteMutation.variables ?? null}
            downloadingFileId={downloadMutation.variables ?? null}
            errorMessage={
              errorMessage(filesQuery.error)
              ?? errorMessage(downloadMutation.error)
              ?? errorMessage(deleteMutation.error)
            }
            files={filesQuery.data?.files ?? []}
            loading={filesQuery.isLoading}
            onDelete={(fileId) => deleteMutation.mutate(fileId)}
            onDownload={(fileId) => downloadMutation.mutate(fileId)}
          />
        ) : null}
      </div>
    </section>
  );
}
