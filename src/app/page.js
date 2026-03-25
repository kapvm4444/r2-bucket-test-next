"use client";

import { useState, useEffect, useRef } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  Trash2,
  ExternalLink,
  RefreshCw,
  FileText,
  CloudUpload,
  FolderOpen,
} from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingKey, setDeletingKey] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const showMessage = (text, type = "success") => {
    if (type === "error") {
      toast.error(text);
    } else {
      toast.success(text);
    }
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

  const uploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      const { signedUrl, error } = await res.json();
      if (error) throw new Error(error);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status === 200 ? resolve() : reject(new Error("Upload failed"));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      showMessage(`"${file.name}" uploaded successfully!`, "success");
      fetchFiles();
    } catch (err) {
      showMessage(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (e) => uploadFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (key, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeletingKey(key);
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage(`"${name}" deleted!`, "success");
      setFiles((prev) => prev.filter((f) => f.key !== key));
    } catch (err) {
      showMessage(`Delete failed: ${err.message}`, "error");
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

  const getFileExtension = (name) => name.split(".").pop().toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 text-white p-2 rounded-xl">
              <CloudUpload className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                R2 File Manager
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Powered by{" "}
                <span className="font-semibold text-orange-500">
                  Cloudflare R2
                </span>{" "}
                · Zero egress cost
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* ── Upload Box ── */}
        <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-3 rounded-xl p-10 cursor-pointer transition-all duration-200 ${
                dragOver
                  ? "bg-orange-50 border-2 border-orange-400 scale-[1.01]"
                  : "hover:bg-slate-50"
              }`}
            >
              <div className="bg-orange-100 p-4 rounded-full">
                <Upload className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700 text-base">
                  {uploading ? "Uploading..." : "Drop your file here"}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  or{" "}
                  <span className="text-orange-500 font-semibold underline underline-offset-2">
                    click to browse
                  </span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInput}
                disabled={uploading}
              />
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="mt-4 space-y-2 px-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-slate-500 text-right font-medium">
                  {uploadProgress}% uploaded
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Files Section ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-800">Your Files</h2>
              {!loadingFiles && (
                <Badge variant="secondary" className="text-xs">
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
              disabled={loadingFiles}
              className="gap-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingFiles ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <Separator />

          {/* Loading Skeletons */}
          {loadingFiles && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-36 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loadingFiles && files.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="bg-slate-100 p-5 rounded-full">
                <FolderOpen className="w-10 h-10 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-500">No files yet</p>
              <p className="text-sm text-slate-400">
                Upload a file above to get started!
              </p>
            </div>
          )}

          {/* File Grid */}
          {!loadingFiles && files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {files.map((file) => (
                <Card
                  key={file.key}
                  className="overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-900 group"
                >
                  {/* Preview */}
                  <div className="h-36 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                    {isImage(file.key) ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`flex-col items-center justify-center gap-1 ${
                        isImage(file.key) ? "hidden" : "flex"
                      } w-full h-full`}
                    >
                      <FileText className="w-10 h-10 text-slate-300" />
                      <Badge
                        variant="outline"
                        className="text-xs font-bold uppercase text-slate-500"
                      >
                        {getFileExtension(file.name)}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <CardContent className="px-3 pt-3 pb-1 space-y-0.5">
                    <p
                      className="text-sm font-semibold text-slate-800 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatSize(file.size)} ·{" "}
                      {new Date(file.lastModified).toLocaleDateString("en-IN")}
                    </p>
                  </CardContent>

                  {/* Actions */}
                  <CardFooter className="px-3 pb-3 pt-2 flex gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="flex-1 h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handleDelete(file.key, file.name)}
                      disabled={deletingKey === file.key}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {deletingKey === file.key ? "..." : "Delete"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <Separator />
        <p className="text-center text-xs text-slate-400 pb-4">
          Files stored on{" "}
          <span className="font-semibold text-orange-400">Cloudflare R2</span> ·
          Zero egress fees · Built with Next.js
        </p>
      </div>
    </main>
  );
}
