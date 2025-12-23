'use client';

import { useState } from 'react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { useFileUpload } from '@/hooks/useFileUpload';
import { KBStats } from '@/components/kb-stats';
import { KBCard } from '@/components/kb-card';
import { UploadZone } from '@/components/upload-zone';
import { FileList } from '@/components/file-list';

export default function KnowledgePage() {
  const { kbs, files, loading, selectedKb, deleteFile, refresh } = useKnowledgeBase();
  const { files: uploadFiles, uploading, addFiles, removeFile, uploadFiles: doUpload, totalSize } = useFileUpload();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const currentKb = kbs.find((kb) => kb.id === selectedKb);

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file? This cannot be undone.')) {
      await deleteFile(fileId);
    }
  };

  const handleUpload = async () => {
    await doUpload();
    setShowUploadModal(false);
    await refresh();
  };

  const filteredFiles = files.filter((file) =>
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display text-4xl mb-2">Your Echo</h1>
          <p className="text-body text-text-secondary">
            Trained on {currentKb?.totalChunks || 0} chunks
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <span>📤</span>
          <span>Upload Files</span>
        </button>
      </div>

      {/* Stats */}
      <KBStats kb={currentKb} totalFiles={files.length} />

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search files..."
          className="w-full max-w-md px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* File Grid */}
      {!loading && filteredFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFiles.map((file) => (
            <KBCard
              key={file.id}
              file={file}
              onDelete={() => handleDelete(file.id)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-subheading text-2xl mb-2">No files yet</h3>
          <p className="text-body text-text-secondary mb-6">
            Upload your content to train your Echo
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary"
          >
            Upload Your First File
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-subheading text-2xl">Upload Files</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-text-secondary hover:text-text-primary text-2xl"
                >
                  ✕
                </button>
              </div>

              <UploadZone onFilesAdded={addFiles} disabled={uploading} />

              <FileList
                files={uploadFiles}
                onRemove={removeFile}
                totalSize={totalSize}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-border rounded-lg text-body hover:border-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || uploadFiles.length === 0}
                  className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
