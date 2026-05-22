import type { FileMetadataSummary } from '@apopto/shared';
import { Alert, Button as MuiButton } from '@mui/material';
import {
  canDownloadFile,
  formatBytes,
  formatCategory,
  formatFileTimestamp,
  statusLabel,
  statusTone,
} from './fileFormatters';

type FileListProps = {
  deletingFileId?: string | null;
  downloadingFileId?: string | null;
  errorMessage?: string;
  files: FileMetadataSummary[];
  loading?: boolean;
  onDelete: (fileId: string) => void;
  onDownload: (fileId: string) => void;
};

export default function FileList({
  deletingFileId,
  downloadingFileId,
  errorMessage,
  files,
  loading = false,
  onDelete,
  onDownload,
}: FileListProps) {
  return (
    <section className="account-status-panel files-list-panel" aria-labelledby="files-list-title">
      <div className="dashboard-section-heading dashboard-section-heading-row">
        <div>
          <span className="dashboard-panel-label">{files.length} files</span>
          <h2 id="files-list-title">Portal files</h2>
        </div>
      </div>
      <p>
        Download links are generated only after a file belongs to your client record
        and has been marked clean by the scan workflow.
      </p>

      {errorMessage ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : null}

      {loading ? (
        <div className="dashboard-empty-module">Loading files.</div>
      ) : files.length === 0 ? (
        <div className="dashboard-empty-module">No files have been uploaded yet.</div>
      ) : (
        <div className="files-list">
          {files.map((file) => {
            const downloadable = canDownloadFile(file);
            const isDownloading = downloadingFileId === file.fileId;
            const isDeleting = deletingFileId === file.fileId;

            return (
              <article className="files-file-card" key={file.fileId}>
                <div className="files-file-main">
                  <span
                    className={`files-status-pill files-status-pill-${statusTone(
                      file.uploadStatus,
                      file.scanStatus,
                    )}`}
                  >
                    {statusLabel(file)}
                  </span>
                  <h3>{file.originalFilename}</h3>
                  <div className="files-file-meta">
                    <span>{formatCategory(file.category)}</span>
                    <span>{formatBytes(file.sizeBytes)}</span>
                    <span>{formatFileTimestamp(file.createdAt)}</span>
                  </div>
                </div>
                <div className="files-file-actions">
                  <MuiButton
                    disabled={!downloadable || isDownloading}
                    onClick={() => onDownload(file.fileId)}
                    size="small"
                    variant="contained"
                  >
                    {isDownloading ? 'Preparing' : 'Download'}
                  </MuiButton>
                  <MuiButton
                    color="inherit"
                    disabled={isDeleting}
                    onClick={() => onDelete(file.fileId)}
                    size="small"
                    variant="outlined"
                  >
                    {isDeleting ? 'Removing' : 'Remove'}
                  </MuiButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
