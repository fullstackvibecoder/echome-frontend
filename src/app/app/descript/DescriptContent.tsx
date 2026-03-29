'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  api,
  DescriptProject,
  DescriptJob,
  DescriptCreateSource,
} from '@/lib/api-client';
import { showErrorToast } from '@/lib/toast';

// ==================== Types ====================

type View = 'list' | 'new' | 'detail';
type NewProjectTab = 'clips' | 'urls';

// ==================== Helpers ====================

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    creating: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    editing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    running: 'bg-blue-100 text-blue-800',
    stopped: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status === 'stopped' ? 'completed' : status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ==================== Sub-components ====================

function JobCard({ job }: { job: DescriptJob }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
      <div className="mt-0.5">
        {job.status === 'running' ? (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        ) : job.status === 'stopped' ? (
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
        ) : job.status === 'failed' ? (
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
        ) : (
          <div className="w-4 h-4 bg-gray-500 rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            job.job_type === 'import' ? 'bg-purple-500/20 text-purple-300' : 'bg-cyan-500/20 text-cyan-300'
          }`}>
            {job.job_type === 'import' ? 'Import' : 'Edit'}
          </span>
          {statusBadge(job.status)}
          <span className="text-xs text-zinc-500">{timeAgo(job.created_at)}</span>
        </div>
        {job.prompt && (
          <p className="mt-1 text-sm text-zinc-300 truncate">{job.prompt}</p>
        )}
        {job.progress_label && job.status === 'running' && (
          <p className="mt-1 text-xs text-zinc-400">{job.progress_label}</p>
        )}
        {job.error_message && (
          <p className="mt-1 text-xs text-red-400">{job.error_message}</p>
        )}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export default function DescriptContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // View state
  const [view, setView] = useState<View>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // List view
  const [projects, setProjects] = useState<DescriptProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // New project view
  const [newTab, setNewTab] = useState<NewProjectTab>('urls');
  const [newTitle, setNewTitle] = useState('');
  const [newUrls, setNewUrls] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail view
  const [detailProject, setDetailProject] = useState<DescriptProject | null>(null);
  const [detailJobs, setDetailJobs] = useState<DescriptJob[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [runningEdit, setRunningEdit] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.replace('/app');
    }
  }, [authLoading, user, router]);

  // Fetch projects on list view
  const fetchProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await api.descript.listProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
      showErrorToast(err, 'loading projects');
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list' && user?.isAdmin) {
      fetchProjects();
    }
  }, [view, user?.isAdmin, fetchProjects]);

  // Fetch project detail
  const fetchDetail = useCallback(async (id: string) => {
    try {
      setLoadingDetail(true);
      const data = await api.descript.getProject(id);
      setDetailProject(data.project);
      setDetailJobs(data.jobs);
    } catch (err) {
      console.error('Failed to fetch project detail', err);
      showErrorToast(err, 'loading project details');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'detail' && selectedProjectId) {
      fetchDetail(selectedProjectId);
    }
  }, [view, selectedProjectId, fetchDetail]);

  // Auto-poll running jobs
  useEffect(() => {
    if (view !== 'detail') return;

    const hasRunning = detailJobs.some((j) => j.status === 'running');
    if (!hasRunning) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      const runningJobs = detailJobs.filter((j) => j.status === 'running');
      for (const job of runningJobs) {
        try {
          const updated = await api.descript.pollJobStatus(job.id);
          setDetailJobs((prev) =>
            prev.map((j) => (j.id === updated.id ? updated : j))
          );
          // If job completed, refresh the project too
          if (updated.status !== 'running' && selectedProjectId) {
            const data = await api.descript.getProject(selectedProjectId);
            setDetailProject(data.project);
          }
        } catch (err) {
          console.error('Poll failed', err);
        }
      }
    }, 5000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [view, detailJobs, selectedProjectId]);

  // Handlers
  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      let source: DescriptCreateSource;
      if (newTab === 'urls') {
        const urls = newUrls.split('\n').map((u) => u.trim()).filter(Boolean);
        if (urls.length === 0) return;
        source = { type: 'urls', urls };
      } else {
        // Clips tab — for now URLs-only (clip selection UI can come later)
        return;
      }

      const result = await api.descript.createProject({ title: newTitle.trim(), source });
      setSelectedProjectId(result.project.id);
      setView('detail');
      setNewTitle('');
      setNewUrls('');
    } catch (err: any) {
      showErrorToast(err, 'creating project');
    } finally {
      setCreating(false);
    }
  };

  const handleRunEdit = async () => {
    if (!editPrompt.trim() || !selectedProjectId) return;
    setRunningEdit(true);
    try {
      const result = await api.descript.runEdit(selectedProjectId, { prompt: editPrompt.trim() });
      setDetailJobs((prev) => [result.job, ...prev]);
      setEditPrompt('');
      // Refresh project to get editing status
      const data = await api.descript.getProject(selectedProjectId);
      setDetailProject(data.project);
    } catch (err: any) {
      showErrorToast(err, 'running edit');
    } finally {
      setRunningEdit(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.descript.deleteProject(projectId);
      if (view === 'detail') {
        setView('list');
      }
      fetchProjects();
    } catch (err: any) {
      showErrorToast(err, 'deleting project');
    }
  };

  const openDetail = (projectId: string) => {
    setSelectedProjectId(projectId);
    setView('detail');
  };

  // ==================== Render ====================

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <div className="p-8 text-center text-zinc-400">This feature is not available yet.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button
              onClick={() => setView('list')}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <h1 className="text-2xl font-bold text-white">Descript Studio</h1>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('new')}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            New Project
          </button>
        )}
      </div>

      {/* ==================== List View ==================== */}
      {view === 'list' && (
        <>
          {loadingProjects ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-400 mb-4">No Descript projects yet.</p>
              <button
                onClick={() => setView('new')}
                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={() => openDetail(project.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <h3 className="text-white font-medium truncate">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {statusBadge(project.status)}
                        <span className="text-xs text-zinc-500">
                          {project.source_type === 'clips' ? 'From clips' : 'From URLs'}
                        </span>
                        <span className="text-xs text-zinc-500">{timeAgo(project.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {project.project_url && (
                      <a
                        href={project.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 text-sm bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
                      >
                        Open in Descript
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ==================== New Project View ==================== */}
      {view === 'new' && (
        <div className="max-w-xl">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-zinc-800 rounded-lg p-1">
            {(['urls', 'clips'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setNewTab(tab)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  newTab === tab ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab === 'urls' ? 'From URLs' : 'From Clips'}
              </button>
            ))}
          </div>

          {/* Title */}
          <label className="block mb-4">
            <span className="text-sm text-zinc-400">Project Title</span>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="My Video Project"
              className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          {newTab === 'urls' ? (
            <label className="block mb-6">
              <span className="text-sm text-zinc-400">Video URLs (one per line, max 20)</span>
              <textarea
                value={newUrls}
                onChange={(e) => setNewUrls(e.target.value)}
                placeholder={"https://example.com/video1.mp4\nhttps://example.com/video2.mp4"}
                rows={6}
                className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 font-mono text-sm"
              />
            </label>
          ) : (
            <div className="mb-6 p-8 bg-zinc-800/50 rounded-lg text-center">
              <p className="text-zinc-400">Clip selection coming soon.</p>
              <p className="text-zinc-500 text-sm mt-1">Use the URLs tab to paste video links directly.</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !newTitle.trim() || (newTab === 'urls' && !newUrls.trim()) || newTab === 'clips'}
            className="w-full py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      )}

      {/* ==================== Detail View ==================== */}
      {view === 'detail' && (
        <>
          {loadingDetail && !detailProject ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : detailProject ? (
            <div className="space-y-6">
              {/* Project Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{detailProject.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    {statusBadge(detailProject.status)}
                    <span className="text-sm text-zinc-500">
                      {detailProject.source_type === 'clips' ? 'From clips' : 'From URLs'}
                    </span>
                  </div>
                  {detailProject.error_message && (
                    <p className="mt-2 text-sm text-red-400">{detailProject.error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {detailProject.project_url && (
                    <a
                      href={detailProject.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        detailProject.status === 'ready'
                          ? 'bg-white text-black hover:bg-zinc-200'
                          : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        if (detailProject.status !== 'ready') e.preventDefault();
                      }}
                    >
                      Open in Descript
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(detailProject.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Edit Panel */}
              {detailProject.status === 'ready' && (
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Agent Edit</h3>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Remove filler words and add captions"
                    rows={3}
                    className="block w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-500">{editPrompt.length}/2000</span>
                    <button
                      onClick={handleRunEdit}
                      disabled={runningEdit || editPrompt.trim().length < 5}
                      className="px-4 py-1.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {runningEdit ? 'Starting...' : 'Run Edit'}
                    </button>
                  </div>
                </div>
              )}

              {/* Waiting state for creating/editing */}
              {(detailProject.status === 'creating' || detailProject.status === 'editing') && (
                <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-zinc-300">
                    {detailProject.status === 'creating' ? 'Importing media into Descript...' : 'Running agent edit...'}
                  </span>
                </div>
              )}

              {/* Job History */}
              {detailJobs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Job History</h3>
                  <div className="space-y-2">
                    {detailJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-zinc-400">Project not found.</p>
          )}
        </>
      )}
    </div>
  );
}
