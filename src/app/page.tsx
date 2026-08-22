'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Settings, 
  RefreshCw, 
  Play, 
  Search, 
  Filter, 
  Clock, 
  ArrowRight, 
  AlertTriangle, 
  User, 
  Send,
  Sliders,
  Sparkles,
  Inbox,
  AlertOctagon,
  Trash2,
  Lock,
  Menu,
  ChevronRight,
  Database
} from 'lucide-react';
import { Email, AuditLogEntry, ActionRecord, SystemSettings, EmailCategory } from '../types/email';

export default function DashboardPage() {
  // Navigation & UI tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'actions' | 'audit' | 'settings'>('dashboard');
  
  // Application Data
  const [emails, setEmails] = useState<Email[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [actions, setActions] = useState<ActionRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    confidenceThreshold: 0.75,
    mode: 'demo',
    isGroqConfigured: false
  });

  // Selection & Details State
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Loading / Processing States
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [emailsRes, auditRes, actionsRes, settingsRes] = await Promise.all([
        fetch('/api/emails'),
        fetch('/api/audit'),
        fetch('/api/actions'),
        fetch('/api/settings')
      ]);

      if (emailsRes.ok) setEmails(await emailsRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
      if (actionsRes.ok) setActions(await actionsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected email when emails list changes (to keep details up-to-date)
  useEffect(() => {
    if (selectedEmail) {
      const updated = emails.find(e => e.id === selectedEmail.id);
      if (updated) {
        setSelectedEmail(updated);
      }
    }
  }, [emails]);

  // Process a single email
  const handleProcessEmail = async (emailId: string) => {
    setProcessingId(emailId);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmails(data.emails);
        // Refresh audits and actions
        const [auditRes, actionsRes] = await Promise.all([
          fetch('/api/audit'),
          fetch('/api/actions')
        ]);
        if (auditRes.ok) setAuditLogs(await auditRes.json());
        if (actionsRes.ok) setActions(await actionsRes.json());
      } else {
        alert(data.error || 'Failed to process email');
      }
    } catch (err) {
      console.error('Error processing email:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Process all pending emails
  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmails(data.emails);
        // Refresh audits and actions
        const [auditRes, actionsRes] = await Promise.all([
          fetch('/api/audit'),
          fetch('/api/actions')
        ]);
        if (auditRes.ok) setAuditLogs(await auditRes.json());
        if (actionsRes.ok) setActions(await actionsRes.json());
      } else {
        alert(data.error || 'Failed to process all emails');
      }
    } catch (err) {
      console.error('Error processing all emails:', err);
    } finally {
      setIsProcessingAll(false);
    }
  };

  // Reset database state
  const handleResetDatabase = async () => {
    if (!confirm('Are you sure you want to reset the database to initial unprocessed state? This clears all actions and audit logs.')) {
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/emails', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setAuditLogs([]);
        setActions([]);
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error('Error resetting database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Settings
  const handleSaveSettings = async (newThreshold: number, newMode: 'demo' | 'ai') => {
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confidenceThreshold: newThreshold, mode: newMode })
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        setSettingsMessage({ text: 'Settings updated successfully.', type: 'success' });
      } else {
        setSettingsMessage({ text: data.error || 'Failed to update settings.', type: 'error' });
      }
    } catch (err) {
      setSettingsMessage({ text: 'Network error saving settings.', type: 'error' });
    }
  };

  // Derivative metrics
  const totalEmails = emails.length;
  const processedCount = emails.filter(e => e.status === 'PROCESSED').length;
  const pendingCount = totalEmails - processedCount;
  
  const autoActionsCount = emails.filter(e => e.status === 'PROCESSED' && e.decision === 'AUTO_ACTION' && e.category !== 'SPAM').length;
  const humanReviewsCount = emails.filter(e => e.status === 'PROCESSED' && e.decision === 'HUMAN_REVIEW').length;
  const spamCount = emails.filter(e => e.status === 'PROCESSED' && e.category === 'SPAM').length;

  // Filtered emails list for Inbox tab
  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || email.status === statusFilter;
    
    let matchesCategory = true;
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'HUMAN_REVIEW') {
        matchesCategory = email.status === 'PROCESSED' && email.decision === 'HUMAN_REVIEW';
      } else {
        matchesCategory = email.category === categoryFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Header Branding */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-600 text-white p-2 rounded-lg font-bold flex items-center justify-center shadow-md shadow-blue-500/20">
                <Sparkles size={20} className="text-white animate-pulse" />
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-wider text-slate-200">SUPERVITY</h1>
                <p className="text-xs text-slate-400 font-medium">Email-to-Action AI</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between bg-slate-950/50 rounded-md py-1.5 px-3 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">System Status</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-semibold text-emerald-400">Operational</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg text-sm transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders size={18} />
                <span>Dashboard</span>
              </div>
              <ChevronRight size={14} className="opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('inbox')}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg text-sm transition-all ${
                activeTab === 'inbox' 
                  ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox size={18} />
                <span>Inbox Queue</span>
              </div>
              {pendingCount > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg text-sm transition-all ${
                activeTab === 'actions' 
                  ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} />
                <span>Actions Taken</span>
              </div>
              <ChevronRight size={14} className="opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg text-sm transition-all ${
                activeTab === 'audit' 
                  ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText size={18} />
                <span>Audit Logs</span>
              </div>
              <ChevronRight size={14} className="opacity-40" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 rounded-lg text-sm transition-all ${
                activeTab === 'settings' 
                  ? 'bg-blue-600/15 text-blue-400 border-l-2 border-blue-500 font-medium' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings size={18} />
                <span>Config Settings</span>
              </div>
              <ChevronRight size={14} className="opacity-40" />
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Pipeline Engine:</span>
              <span className="font-semibold text-blue-400 uppercase tracking-wider text-[10px]">
                {settings.mode === 'ai' ? 'Groq Llama-3' : 'Rule-Based'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Auto Threshold:</span>
              <span className="font-semibold text-slate-200">{Math.round(settings.confidenceThreshold * 100)}%</span>
            </div>
            <button
              onClick={handleResetDatabase}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-red-400 hover:border-red-950 transition-colors"
            >
              <Database size={13} />
              Reset Database
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        
        {/* Header Status Bar */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-200 uppercase">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'inbox' && 'Inbox Queue'}
              {activeTab === 'actions' && 'Autonomous Business Actions'}
              {activeTab === 'audit' && 'System Audit Trail'}
              {activeTab === 'settings' && 'AI Employee Configuration'}
            </h2>
            {settings.mode === 'demo' ? (
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs py-0.5 px-2.5 rounded font-medium">
                Demo Mode — deterministic classifier
              </span>
            ) : (
              <span className="bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs py-0.5 px-2.5 rounded font-medium flex items-center gap-1">
                <Sparkles size={11} className="text-blue-400" />
                AI Mode Enabled
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={handleProcessAll}
                disabled={isProcessingAll}
                className="flex items-center gap-2 bg-blue-600 text-white text-xs font-semibold py-1.5 px-4 rounded shadow-md hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {isProcessingAll ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Play size={13} className="fill-white" />
                )}
                Process All Emails
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 border border-slate-800 rounded bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Render Tab Contents */}
        <div className="p-8 flex-1 min-w-0">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                  <span className="text-xs text-slate-400 font-medium">Total Emails</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{totalEmails}</span>
                    <Mail className="text-slate-600" size={20} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                  <span className="text-xs text-slate-400 font-medium">Processed</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-slate-300">{processedCount}</span>
                    <CheckCircle2 className="text-emerald-500/80" size={20} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                  <span className="text-xs text-slate-400 font-medium">Auto Actions</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-blue-400">{autoActionsCount}</span>
                    <Sparkles className="text-blue-500/80" size={20} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                  <span className="text-xs text-slate-400 font-medium">Human Reviews</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-amber-500">{humanReviewsCount}</span>
                    <AlertTriangle className="text-amber-500/80" size={20} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                  <span className="text-xs text-slate-400 font-medium">Spam Detected</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-rose-500">{spamCount}</span>
                    <AlertOctagon className="text-rose-500/80" size={20} />
                  </div>
                </div>
              </div>

              {/* Action/Review Queues & Operations */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left panel: Quick Actions & Instructions */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6 lg:col-span-2">
                  <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Operating Principle</h3>
                  <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-lg space-y-3">
                    <span className="text-blue-400 font-bold text-xs uppercase tracking-widest block">Safe Automation Framework</span>
                    <blockquote className="text-base italic text-slate-300">
                      "AI interprets unstructured email details, deterministic business logic executes the workflow, human review handles the uncertainty."
                    </blockquote>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Every incoming email is classified server-side. If the confidence rating is below the auto-threshold ({Math.round(settings.confidenceThreshold * 100)}%), or if double intent is identified, the transaction is immediately halted and routed to the Human Review Queue instead of triggering autonomous API tasks.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Pending Action Backlog</h4>
                    {emails.filter(e => e.status === 'PENDING').length === 0 ? (
                      <div className="bg-slate-950/40 py-8 text-center rounded border border-dashed border-slate-800 text-slate-400 text-sm">
                        ✓ All incoming emails processed. Operational queue is clean.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {emails.filter(e => e.status === 'PENDING').map(email => (
                          <div key={email.id} className="flex items-center justify-between p-3.5 bg-slate-950 rounded border border-slate-800 hover:border-slate-700 transition-colors">
                            <div className="min-w-0 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">{email.senderName}</span>
                                <span className="text-[10px] bg-slate-800 py-0.5 px-2 rounded text-slate-400 font-mono">{email.id}</span>
                              </div>
                              <h5 className="text-sm font-medium text-slate-200 truncate mt-0.5">{email.subject}</h5>
                            </div>
                            <button
                              onClick={() => handleProcessEmail(email.id)}
                              disabled={processingId === email.id}
                              className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              {processingId === email.id ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <Play size={10} className="fill-current" />
                              )}
                              Process Email
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right panel: Recent Process Log */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase mb-4">Recent Audit Stream</h3>
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-16 text-slate-500 text-sm">
                        No transactions registered yet.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {auditLogs.slice(0, 5).map(log => (
                          <div key={log.id} className="border-l-2 border-blue-500/30 pl-3.5 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-mono text-slate-500">{log.id}</span>
                              <span className="text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-slate-300 font-medium">{log.subject}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                log.decision === 'AUTO_ACTION' 
                                  ? 'bg-blue-600/15 text-blue-400' 
                                  : log.category === 'SPAM' 
                                    ? 'bg-rose-600/15 text-rose-400' 
                                    : 'bg-amber-600/15 text-amber-400'
                              }`}>
                                {log.decision === 'AUTO_ACTION' ? 'AUTO' : log.category === 'SPAM' ? 'SPAM' : 'REVIEW'}
                              </span>
                              <span className="text-xs text-slate-400 truncate">{log.action}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab('audit')}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 rounded transition-colors"
                  >
                    View All Audit Logs
                    <ArrowRight size={13} />
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: INBOX */}
          {activeTab === 'inbox' && (
            <div className="flex gap-6 h-[calc(100vh-12rem)] items-stretch">
              
              {/* Inbox List (Left Column) */}
              <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden min-w-0">
                
                {/* Search / Filters Bar */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/80 space-y-3 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      placeholder="Search by ID, sender, subject or body text..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Filter size={13} />
                      <span>Filters:</span>
                    </div>

                    <div className="flex gap-2">
                      {['ALL', 'PENDING', 'PROCESSED'].map(status => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`text-xs px-2.5 py-1 rounded font-medium border transition-colors ${
                            statusFilter === status 
                              ? 'bg-blue-600/15 border-blue-500 text-blue-400' 
                              : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <div className="h-4 w-px bg-slate-800"></div>

                    <div className="flex gap-2 overflow-x-auto">
                      {['ALL', 'INVOICE_SUBMISSION', 'PAYMENT_QUERY', 'DISPUTE', 'SPAM', 'HUMAN_REVIEW'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`text-xs px-2.5 py-1 rounded font-medium border whitespace-nowrap transition-colors ${
                            categoryFilter === cat 
                              ? 'bg-blue-600/15 border-blue-500 text-blue-400' 
                              : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cat === 'ALL' 
                            ? 'ALL INTENTS' 
                            : cat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Emails Table */}
                <div className="flex-1 overflow-y-auto">
                  {filteredEmails.length === 0 ? (
                    <div className="text-center py-24 text-slate-500 text-sm">
                      No emails match the selected filters or search queries.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/60 bg-slate-950/20 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="p-4 pl-6">ID & Sender</th>
                          <th className="p-4">Subject</th>
                          <th className="p-4">Category</th>
                          <th className="p-4 text-center">Confidence</th>
                          <th className="p-4">Status & Action</th>
                          <th className="p-4 pr-6 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filteredEmails.map(email => (
                          <tr
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${
                              selectedEmail?.id === email.id ? 'bg-slate-800/40 border-l-2 border-blue-500' : ''
                            }`}
                          >
                            <td className="p-4 pl-6">
                              <div className="font-medium text-slate-200">{email.senderName}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{email.id} • {email.sender}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-medium text-slate-300 truncate max-w-xs">{email.subject}</div>
                              <div className="text-xs text-slate-500 truncate max-w-xs mt-0.5">{email.body}</div>
                            </td>
                            <td className="p-4">
                              {email.status === 'PENDING' ? (
                                <span className="text-xs text-slate-500 uppercase">Unclassified</span>
                              ) : (
                                <span className={`text-xs px-2.5 py-0.5 rounded font-medium ${
                                  email.category === 'INVOICE_SUBMISSION' ? 'bg-emerald-500/10 text-emerald-400' :
                                  email.category === 'PAYMENT_QUERY' ? 'bg-cyan-500/10 text-cyan-400' :
                                  email.category === 'DISPUTE' ? 'bg-rose-500/10 text-rose-400' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {email.category.replace('_', ' ')}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {email.status === 'PENDING' ? (
                                <span className="text-slate-600">—</span>
                              ) : (
                                <span className={`text-sm font-bold ${
                                  email.confidence >= settings.confidenceThreshold ? 'text-emerald-400' : 'text-amber-500'
                                }`}>
                                  {Math.round(email.confidence * 100)}%
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              {email.status === 'PENDING' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProcessEmail(email.id);
                                  }}
                                  disabled={processingId === email.id}
                                  className="bg-blue-600 text-white font-medium text-xs px-3 py-1 rounded hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1"
                                >
                                  {processingId === email.id ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <Play size={10} className="fill-current" />
                                  )}
                                  Run AI
                                </button>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className={`text-xs font-semibold ${
                                    email.decision === 'AUTO_ACTION' 
                                      ? 'text-blue-400' 
                                      : email.category === 'SPAM' 
                                        ? 'text-rose-400' 
                                        : 'text-amber-500'
                                  }`}>
                                    {email.decision === 'AUTO_ACTION' ? '✓ Auto Action' : email.category === 'SPAM' ? '✓ Spam Blocked' : '⚠ Human Review'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{email.action}</div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 pr-6 text-right text-xs text-slate-500 font-mono">
                              {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Email Detail Panel (Right Column) */}
              <div className="w-[450px] bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shrink-0">
                {selectedEmail ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-800 flex justify-between items-start shrink-0">
                      <div>
                        <span className="text-[10px] bg-slate-950 text-slate-400 font-mono py-1 px-2.5 rounded border border-slate-800">
                          {selectedEmail.id}
                        </span>
                        <h3 className="text-base font-semibold mt-3 text-slate-200">{selectedEmail.subject}</h3>
                        <p className="text-xs text-slate-400 mt-1">From: {selectedEmail.senderName} ({selectedEmail.sender})</p>
                      </div>
                    </div>

                    {/* Scrollable details */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      
                      {/* Section 1: Email Body */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Text</span>
                        <div className="p-3.5 bg-slate-950 text-xs text-slate-300 font-mono whitespace-pre-wrap rounded border border-slate-800 leading-relaxed max-h-40 overflow-y-auto">
                          {selectedEmail.body}
                        </div>
                      </div>

                      {/* Section 2: Pipeline decision and details */}
                      {selectedEmail.status === 'PENDING' ? (
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-lg text-center space-y-4">
                          <Inbox size={24} className="mx-auto text-slate-600" />
                          <p className="text-xs text-slate-400">
                            This transaction is in PENDING status. Run the classification engine to categorize intent and trigger deterministic actions.
                          </p>
                          <button
                            onClick={() => handleProcessEmail(selectedEmail.id)}
                            disabled={processingId === selectedEmail.id}
                            className="mx-auto bg-blue-600 text-white font-semibold text-xs py-2 px-6 rounded shadow-md hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                          >
                            {processingId === selectedEmail.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Play size={12} className="fill-current" />
                            )}
                            Process Now
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          
                          {/* Classification Block */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Intelligent Intent</span>
                              <span className="text-xs font-bold text-slate-200 mt-1 block">
                                {selectedEmail.category.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">AI Confidence</span>
                              <span className={`text-xs font-bold mt-1 block ${
                                selectedEmail.confidence >= settings.confidenceThreshold ? 'text-emerald-400' : 'text-amber-500'
                              }`}>
                                {Math.round(selectedEmail.confidence * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Decision Badge */}
                          <div className={`p-4 rounded-lg border ${
                            selectedEmail.decision === 'AUTO_ACTION' 
                              ? 'bg-blue-600/5 border-blue-500/20 text-slate-200' 
                              : selectedEmail.category === 'SPAM' 
                                ? 'bg-rose-500/5 border-rose-500/20 text-slate-200'
                                : 'bg-amber-500/5 border-amber-500/20 text-slate-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {selectedEmail.decision === 'AUTO_ACTION' ? (
                                <CheckCircle2 className="text-blue-500 shrink-0" size={16} />
                              ) : selectedEmail.category === 'SPAM' ? (
                                <AlertOctagon className="text-rose-500 shrink-0" size={16} />
                              ) : (
                                <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                              )}
                              <span className="text-xs font-bold uppercase tracking-wider">
                                {selectedEmail.decision === 'AUTO_ACTION' ? 'Autonomous Action Allowed' : selectedEmail.category === 'SPAM' ? 'Spam Suspended' : 'Human Review Required'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                              {selectedEmail.reasoning}
                            </p>
                          </div>

                          {/* Extracted JSON Details */}
                          {Object.keys(selectedEmail.extractedData).length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Extracted Metadata</span>
                              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1 text-slate-300 font-mono">
                                {selectedEmail.extractedData.vendor && <div><span className="text-slate-500">Vendor:</span> {selectedEmail.extractedData.vendor}</div>}
                                {selectedEmail.extractedData.invoiceNumber && <div><span className="text-slate-500">Invoice:</span> {selectedEmail.extractedData.invoiceNumber}</div>}
                                {selectedEmail.extractedData.amount && <div><span className="text-slate-500">Amount:</span> ₹{selectedEmail.extractedData.amount.toLocaleString('en-IN')}</div>}
                                {selectedEmail.extractedData.dueDate && <div><span className="text-slate-500">Due Date:</span> {selectedEmail.extractedData.dueDate}</div>}
                                {selectedEmail.extractedData.disputeReason && <div><span className="text-slate-500">Dispute Reason:</span> {selectedEmail.extractedData.disputeReason}</div>}
                              </div>
                            </div>
                          )}

                          {/* Action Output */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Execution Pipeline Output</span>
                            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1 text-xs">
                              <div className="font-semibold text-slate-300">{selectedEmail.action}</div>
                              <p className="text-slate-400 leading-relaxed text-[11px]">{selectedEmail.actionResult}</p>
                            </div>
                          </div>

                          {/* Draft Reply */}
                          {selectedEmail.draftResponse && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generated Draft Reply</span>
                              <div className="p-3.5 bg-slate-950 text-xs text-slate-300 font-mono whitespace-pre-wrap rounded border border-slate-800 leading-relaxed">
                                {selectedEmail.draftResponse}
                              </div>
                            </div>
                          )}

                          {/* Process Timeline */}
                          <div className="space-y-3.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Process Timeline Audit</span>
                            <div className="space-y-3.5 relative pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
                              {selectedEmail.auditTrail.map((step, idx) => (
                                <div key={idx} className="relative text-xs">
                                  <span className="absolute -left-[19px] top-1.5 h-2 w-2 rounded-full bg-blue-500 border border-slate-900"></span>
                                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                                    <span className="font-bold uppercase tracking-wider text-slate-400">{step.event}</span>
                                    <span>{new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                  </div>
                                  <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">{step.details}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <Mail size={32} className="text-slate-700" />
                    <h3 className="text-sm font-semibold text-slate-400">No Email Selected</h3>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Click any message in the inbox to view raw data, classification rationale, extracted variables, and deterministic action trails.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: ACTIONS */}
          {activeTab === 'actions' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Autonomous Logs</h3>
                
                <div className="flex gap-2">
                  {['ALL', 'SUCCESS', 'PENDING_REVIEW', 'MARKED_SPAM'].map(status => (
                    <button
                      key={status}
                      onClick={() => setActionFilter(status)}
                      className={`text-xs px-3 py-1.5 rounded font-medium border transition-colors ${
                        actionFilter === status 
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400' 
                          : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                {actions.length === 0 ? (
                  <div className="text-center py-24 text-slate-500 text-sm">
                    No actions registered yet. Process pending emails in the inbox.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/60 bg-slate-950/25 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4 pl-6">Action ID</th>
                        <th className="p-4">Related Email</th>
                        <th className="p-4">Action Type</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Details</th>
                        <th className="p-4 pr-6 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-sm">
                      {actions
                        .filter(act => actionFilter === 'ALL' || act.status === actionFilter)
                        .map(action => (
                          <tr key={action.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="p-4 pl-6 font-mono text-xs text-slate-400 font-semibold">{action.id}</td>
                            <td className="p-4">
                              <div className="font-semibold text-slate-300">{action.senderName}</div>
                              <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{action.emailSubject}</div>
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-300">{action.type}</td>
                            <td className="p-4">
                              <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold ${
                                action.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                                action.status === 'PENDING_REVIEW' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                {action.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-slate-400 max-w-sm truncate">{action.details}</td>
                            <td className="p-4 pr-6 text-right font-mono text-xs text-slate-500">
                              {new Date(action.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 bg-slate-900/60">
                <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Complete System Traceability</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chronological records of all classification decisions, confidence metrics, and deterministic outcomes executed by the Supervity AI Employee.
                </p>
              </div>

              <div className="overflow-x-auto">
                {auditLogs.length === 0 ? (
                  <div className="text-center py-24 text-slate-500 text-sm">
                    No transactions registered in audit trail.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/60 bg-slate-950/25 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-4 pl-6">Trace ID</th>
                        <th className="p-4">Email ID</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Intent Intent</th>
                        <th className="p-4 text-center">Confidence</th>
                        <th className="p-4">Decision</th>
                        <th className="p-4">Action Taken</th>
                        <th className="p-4 pr-6">Reasoning Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-xs text-slate-300">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-800/20 transition-colors font-mono">
                          <td className="p-4 pl-6 text-slate-500 font-semibold">{log.id}</td>
                          <td className="p-4 text-slate-500">{log.emailId}</td>
                          <td className="p-4 font-sans text-slate-300 font-medium truncate max-w-[150px]">{log.subject}</td>
                          <td className="p-4">
                            <span className="text-[10px] uppercase font-bold text-slate-400">
                              {log.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-200">{Math.round(log.confidence * 100)}%</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              log.decision === 'AUTO_ACTION' ? 'bg-blue-600/10 text-blue-400' :
                              log.category === 'SPAM' ? 'bg-rose-600/10 text-rose-400' :
                              'bg-amber-600/10 text-amber-400'
                            }`}>
                              {log.decision}
                            </span>
                          </td>
                          <td className="p-4 font-sans text-slate-300">{log.action}</td>
                          <td className="p-4 pr-6 font-sans text-slate-400 max-w-xs truncate leading-relaxed">{log.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
              
              <div className="space-y-1.5 border-b border-slate-800 pb-5">
                <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">AI Pipeline Config</h3>
                <p className="text-xs text-slate-500">
                  Configure autonomous routing policies, safety limits, and LLM backend credentials.
                </p>
              </div>

              {/* Automation Policy Trust/Safety Info Box */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Automation Policy</span>
                <p className="text-slate-300 font-semibold leading-relaxed">
                  AI interprets. Deterministic rules execute. Human review handles uncertainty.
                </p>
                <div className="text-slate-500 text-[11px]">
                  Confidence threshold: <span className="font-mono font-bold text-slate-300">{Math.round(settings.confidenceThreshold * 100)}%</span>
                </div>
              </div>

              {/* Save settings feedbacks */}
              {settingsMessage && (
                <div className={`p-4 rounded text-xs font-semibold ${
                  settingsMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}>
                  {settingsMessage.text}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="space-y-3">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Processing Engine Mode</span>
                <div className="grid grid-cols-2 gap-4">
                  
                  <button
                    onClick={() => handleSaveSettings(settings.confidenceThreshold, 'demo')}
                    className={`p-4 text-left rounded-lg border transition-all ${
                      settings.mode === 'demo'
                        ? 'bg-blue-600/10 border-blue-500 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-sm">Demo Mode (Local Engine)</div>
                    <p className="text-[11px] mt-1.5 leading-relaxed text-slate-400">
                      Deterministic rule-based intent parsing and metadata extraction. Zero latency, 100% reproducible results.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      if (!settings.isGroqConfigured) {
                        alert('GROQ_API_KEY is missing on the server. Please add it to your environment variables to enable AI Mode.');
                        return;
                      }
                      handleSaveSettings(settings.confidenceThreshold, 'ai');
                    }}
                    className={`p-4 text-left rounded-lg border transition-all relative ${
                      settings.mode === 'ai'
                        ? 'bg-blue-600/10 border-blue-500 text-slate-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                    } ${!settings.isGroqConfigured ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {!settings.isGroqConfigured && (
                      <span className="absolute top-3 right-3 text-[10px] bg-slate-900 border border-slate-800 text-amber-500 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Lock size={10} />
                        Locked
                      </span>
                    )}
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      AI Mode (Groq Llama-3)
                      <Sparkles size={13} className="text-blue-400" />
                    </div>
                    <p className="text-[11px] mt-1.5 leading-relaxed text-slate-400">
                      Unstructured classification powered by Llama-3-70B model on Groq. Returns validated JSON structures.
                    </p>
                  </button>

                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="space-y-3.5 border-t border-slate-800 pt-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Confidence Safety Gate</span>
                  <span className="font-mono text-sm font-bold text-blue-400">{Math.round(settings.confidenceThreshold * 100)}% Confidence</span>
                </div>
                
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={settings.confidenceThreshold}
                  onChange={(e) => handleSaveSettings(parseFloat(e.target.value), settings.mode)}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />
                
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Emails processed with an intent score below this gate are automatically denied auto-execution and routed to the human supervisor queue.
                </p>
              </div>

              {/* Credentials details (Diagnostics) */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Diagnostics Information</span>
                
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">AI Provider:</span>
                    <span className="text-slate-300">Groq Cloud</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AI Status:</span>
                    {settings.isGroqConfigured ? (
                      <span className="text-emerald-400 font-semibold">Groq API: Configured</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">Groq API: Not configured</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Database Engine:</span>
                    <span className="text-slate-300">In-Memory Mock Store</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}
