"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [deletingKey, setDeletingKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' }
  const fileInputRef = useRef(null);

  // Load files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      showMessage("Failed to load files.", "error");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL from our backend
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      const { signedUrl, error } = await res.json();
      if (error) throw new Error(error);

      // Step 2: Upload DIRECTLY to R2 using presigned URL
      // Using XMLHttpRequest to track upload progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) resolve();
          else reject(new Error("Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      showMessage(`✅ "${file.name}" uploaded successfully!`);
      fetchFiles(); // Refresh list
    } catch (err) {
      showMessage(`❌ Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (key, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setDeletingKey(key);
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage(`🗑️ "${name}" deleted successfully!`);
      setFiles((prev) => prev.filter((f) => f.key !== key));
    } catch (err) {
      showMessage(`❌ Delete failed: ${err.message}`, "error");
    } finally {
      setDeletingKey(null);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImage = (key) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(key);

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>☁️ R2 File Manager</h1>
          <p style={styles.subtitle}>
            Powered by <strong>Cloudflare R2</strong> — Upload, view and delete
            files.
          </p>
        </div>

        {/* Toast Message */}
        {message && (
          <div
            style={{
              ...styles.toast,
              background: message.type === "error" ? "#fee2e2" : "#dcfce7",
              borderColor: message.type === "error" ? "#f87171" : "#4ade80",
              color: message.type === "error" ? "#991b1b" : "#166534",
            }}
          >
            {message.text}
          </div>
        )}

        {/* Upload Section */}
        <div style={styles.uploadBox}>
          <h2 style={styles.sectionTitle}>📤 Upload a File</h2>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={styles.fileInput}
          />
          {uploading && (
            <div style={styles.progressWrapper}>
              <div
                style={{ ...styles.progressBar, width: `${uploadProgress}%` }}
              />
              <span style={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}
        </div>

        {/* Files List */}
        <div style={styles.filesSection}>
          <div style={styles.filesHeader}>
            <h2 style={styles.sectionTitle}>📂 Your Files</h2>
            <button
              onClick={fetchFiles}
              style={styles.refreshBtn}
              disabled={loadingFiles}
            >
              {loadingFiles ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>

          {loadingFiles ? (
            <p style={styles.empty}>Loading files...</p>
          ) : files.length === 0 ? (
            <p style={styles.empty}>No files yet. Upload something above!</p>
          ) : (
            <div style={styles.grid}>
              {files.map((file) => (
                <div key={file.key} style={styles.card}>
                  {/* Preview */}
                  <div style={styles.preview}>
                    {isImage(file.key) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        style={styles.previewImg}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "block";
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        ...styles.fileIcon,
                        display: isImage(file.key) ? "none" : "flex",
                      }}
                    >
                      📄
                    </div>
                  </div>

                  {/* File Info */}
                  <div style={styles.cardBody}>
                    <p style={styles.fileName} title={file.name}>
                      {file.name.length > 25
                        ? file.name.slice(0, 25) + "…"
                        : file.name}
                    </p>
                    <p style={styles.fileMeta}>
                      {formatSize(file.size)} •{" "}
                      {new Date(file.lastModified).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={styles.cardActions}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.viewBtn}
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(file.key, file.name)}
                      disabled={deletingKey === file.key}
                      style={styles.deleteBtn}
                    >
                      {deletingKey === file.key ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Inline Styles ────────────────────────────────────────────────────────────
const styles = {
  main: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "system-ui, sans-serif",
    padding: "24px 16px",
  },
  container: {
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "800",
    color: "#1e293b",
    margin: "0 0 8px",
  },
  subtitle: {
    color: "#64748b",
    fontSize: "1rem",
  },
  toast: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid",
    marginBottom: "20px",
    fontWeight: "600",
    fontSize: "0.9rem",
  },
  uploadBox: {
    background: "#fff",
    border: "2px dashed #cbd5e1",
    borderRadius: "12px",
    padding: "28px",
    marginBottom: "28px",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 0,
    marginBottom: "16px",
  },
  fileInput: {
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  progressWrapper: {
    marginTop: "14px",
    background: "#e2e8f0",
    borderRadius: "999px",
    height: "12px",
    position: "relative",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "#6366f1",
    borderRadius: "999px",
    transition: "width 0.2s ease",
  },
  progressText: {
    position: "absolute",
    right: "8px",
    top: "-1px",
    fontSize: "10px",
    fontWeight: "700",
    color: "#1e293b",
  },
  filesSection: {
    background: "#fff",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  filesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  refreshBtn: {
    padding: "6px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    color: "#475569",
  },
  empty: {
    color: "#94a3b8",
    textAlign: "center",
    padding: "40px 0",
    fontSize: "0.95rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
  },
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    overflow: "hidden",
    background: "#fafafa",
    transition: "box-shadow 0.2s",
  },
  preview: {
    height: "130px",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  fileIcon: {
    fontSize: "3rem",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  cardBody: {
    padding: "10px 12px 4px",
  },
  fileName: {
    fontWeight: "700",
    fontSize: "0.85rem",
    color: "#1e293b",
    margin: "0 0 4px",
  },
  fileMeta: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    margin: 0,
  },
  cardActions: {
    display: "flex",
    gap: "8px",
    padding: "10px 12px 12px",
  },
  viewBtn: {
    flex: 1,
    textAlign: "center",
    padding: "6px",
    borderRadius: "6px",
    background: "#6366f1",
    color: "#fff",
    fontWeight: "600",
    fontSize: "0.8rem",
    textDecoration: "none",
  },
  deleteBtn: {
    flex: 1,
    padding: "6px",
    borderRadius: "6px",
    background: "#fee2e2",
    color: "#dc2626",
    fontWeight: "600",
    fontSize: "0.8rem",
    border: "none",
    cursor: "pointer",
  },
};
