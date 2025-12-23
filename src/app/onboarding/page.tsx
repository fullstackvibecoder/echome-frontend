'use client';

import { useRouter } from 'next/navigation';
import { useFileUpload } from '@/hooks/useFileUpload';
import { UploadZone } from '@/components/upload-zone';
import { FileList } from '@/components/file-list';

export default function OnboardingPage() {
  const router = useRouter();
  const { files, uploading, addFiles, removeFile, uploadFiles, totalSize } =
    useFileUpload();

  const handleNext = async () => {
    // Upload any pending files
    if (files.some((f) => f.status === 'pending')) {
      await uploadFiles();
    }

    // Navigate to next step
    router.push('/onboarding/step-2');
  };

  const handleSkip = () => {
    router.push('/onboarding/step-2');
  };

  const hasPendingOrCompleted = files.some(
    (f) => f.status === 'pending' || f.status === 'completed'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-secondary via-bg-primary to-bg-secondary">
      {/* Logo */}
      <div className="absolute top-8 left-8">
        <h1 className="text-2xl font-display font-bold text-accent">EchoMe</h1>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold">
          1
        </div>
        <div className="w-8 h-8 rounded-full bg-border text-text-secondary flex items-center justify-center text-sm">
          2
        </div>
        <div className="w-8 h-8 rounded-full bg-border text-text-secondary flex items-center justify-center text-sm">
          3
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 max-w-7xl mx-auto">
          {/* Left Side - Information */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="animate-fade-in">
              <h1 className="text-display text-4xl md:text-5xl mb-6">
                Train Your Echo
              </h1>

              <p className="text-body text-xl text-text-secondary mb-4">
                Upload the content you have actually created
              </p>

              <p className="text-body text-text-secondary mb-6">
                PDFs, videos, emails, social posts, anything that represents
                your authentic voice.
              </p>

              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <p className="text-small text-accent font-medium">
                  💡 The more you upload, the better your content will be
                </p>
              </div>

              {/* Benefits List */}
              <ul className="mt-8 space-y-3 text-body text-text-secondary">
                <li className="flex items-start gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>We analyze your writing style and tone</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>Your voice model gets stronger over time</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-accent text-xl">✓</span>
                  <span>Everything is encrypted and private</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Side - Upload Area */}
          <div className="lg:col-span-3">
            <div className="card animate-slide-in">
              {/* Upload Zone */}
              <UploadZone onFilesAdded={addFiles} disabled={uploading} />

              {/* File List */}
              <FileList
                files={files}
                onRemove={removeFile}
                totalSize={totalSize}
              />

              {/* Actions */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                <button
                  onClick={handleSkip}
                  disabled={uploading}
                  className="text-body text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                >
                  Skip for now
                </button>

                <button
                  onClick={handleNext}
                  disabled={uploading || !hasPendingOrCompleted}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading
                    ? 'Uploading...'
                    : files.some((f) => f.status === 'pending')
                    ? 'Upload & Continue'
                    : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
