import type { DashboardProjectSummary, FileCategory } from '@apopto/shared';
import { Alert, Button as MuiButton, MenuItem, TextField } from '@mui/material';
import { useMemo, useState, type FormEvent } from 'react';
import { fileCategoryOptions, formatBytes } from './fileFormatters';

type FileUploadPanelProps = {
  disabled?: boolean;
  errorMessage?: string;
  onUpload: (input: {
    category: FileCategory;
    file: File;
    projectId?: string;
  }) => Promise<unknown>;
  projects: DashboardProjectSummary[];
  statusMessage?: string;
  uploading?: boolean;
};

export default function FileUploadPanel({
  disabled = false,
  errorMessage,
  onUpload,
  projects,
  statusMessage,
  uploading = false,
}: FileUploadPanelProps) {
  const [category, setCategory] = useState<FileCategory>('other');
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState('');
  const selectedFileLabel = useMemo(() => (
    file ? `${file.name} · ${formatBytes(file.size)}` : 'Choose a project file'
  ), [file]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      return;
    }

    await onUpload({
      category,
      file,
      ...(projectId ? { projectId } : {}),
    });
    setFile(null);
    event.currentTarget.reset();
  }

  return (
    <section className="account-status-panel files-upload-panel" aria-labelledby="files-upload-title">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Direct S3 upload</span>
        <h2 id="files-upload-title">Upload project files</h2>
      </div>
      <p>
        The browser requests a short-lived upload URL, sends the file directly to S3,
        then confirms the upload so the scan workflow can continue.
      </p>

      <form className="files-upload-form" onSubmit={handleSubmit}>
        <label className="files-dropzone">
          <input
            disabled={disabled || uploading}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <span>{selectedFileLabel}</span>
          <small>Private upload, malware scan required before download.</small>
        </label>

        <div className="files-form-grid">
          <TextField
            disabled={disabled || uploading}
            fullWidth
            label="Category"
            onChange={(event) => setCategory(event.target.value as FileCategory)}
            select
            value={category}
          >
            {fileCategoryOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            disabled={disabled || uploading || projects.length === 0}
            fullWidth
            label="Project"
            onChange={(event) => setProjectId(event.target.value)}
            select
            value={projectId}
          >
            <MenuItem value="">General files</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.projectId} value={project.projectId}>
                {project.name}
              </MenuItem>
            ))}
          </TextField>
        </div>

        {errorMessage ? (
          <Alert severity="error">{errorMessage}</Alert>
        ) : null}

        {statusMessage ? (
          <div className="files-upload-status" role="status">
            {statusMessage}
          </div>
        ) : null}

        <MuiButton
          className="files-upload-button"
          disabled={!file || disabled || uploading}
          type="submit"
          variant="contained"
        >
          {uploading ? 'Uploading' : 'Upload file'}
        </MuiButton>
      </form>
    </section>
  );
}
