export default function FileGuidancePanel() {
  return (
    <aside className="account-status-panel files-guidance-panel">
      <span className="dashboard-panel-label">Upload guidance</span>
      <h2>Keep project files useful and safe.</h2>
      <p>
        Files upload directly to private S3 storage, then scan before they become
        available for download in the portal.
      </p>
      <div className="files-warning" role="note">
        <strong>No secrets.</strong>
        <span>
          Do not upload passwords, API keys, seed phrases, private keys, or unredacted
          credentials.
        </span>
      </div>
      <ul className="files-guidance-list">
        <li>Default upload limit is 50 MB per file unless your portal limit is raised.</li>
        <li>Good uploads include logos, brand guides, copy, screenshots, PDFs, images, and documents.</li>
        <li>Script, executable, installer, and command files are blocked for client uploads.</li>
        <li>New uploads stay in review until the scan workflow marks them clean.</li>
      </ul>
    </aside>
  );
}
