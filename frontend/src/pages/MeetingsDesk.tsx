import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MeetingItem } from '../types';
import {
  Calendar, Clock, Plus, RefreshCw, Video, MapPin, Sparkles,
  CheckCircle2, FileText, Users, AlertCircle, ChevronRight
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

export const MeetingsDesk: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Meeting Form
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('CLIENT_CONSULTATION');
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [locationOrLink, setLocationOrLink] = useState('Google Meet');
  const [agenda, setAgenda] = useState('');
  const [discussionNotes, setDiscussionNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [meets, custs] = await Promise.all([
        api.getMeetings(false),
        api.getCustomers({ limit: 100 })
      ]);
      setMeetings(meets);
      setCustomers(custs);
      if (meets.length > 0 && !selectedMeeting) {
        setSelectedMeeting(meets[0]);
      }
    } catch (err: any) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createMeeting({
        title,
        meeting_type: meetingType,
        customer_id: customerId ? Number(customerId) : undefined,
        scheduled_time: scheduledTime,
        duration_minutes: parseInt(durationMinutes) || 45,
        location_or_link: locationOrLink || undefined,
        agenda: agenda || undefined,
        discussion_notes: discussionNotes || undefined
      });
      setCreateModalOpen(false);
      setTitle('');
      setAgenda('');
      setDiscussionNotes('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to schedule meeting: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSummary = async (meetingId: number) => {
    setGeneratingSummary(true);
    try {
      const res = await api.generateMeetingSummary(meetingId);
      if (selectedMeeting && selectedMeeting.id === meetingId) {
        setSelectedMeeting({
          ...selectedMeeting,
          ai_summary: res.ai_summary,
          action_items: res.action_items,
          status: 'COMPLETED'
        });
      }
      setMeetings(prev => prev.map(m => m.id === meetingId ? {
        ...m,
        ai_summary: res.ai_summary,
        action_items: res.action_items,
        status: 'COMPLETED'
      } : m));
    } catch (err: any) {
      alert(`AI Summary generation failed: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedMeeting) return;
    try {
      await api.updateMeeting(selectedMeeting.id, {
        discussion_notes: selectedMeeting.discussion_notes,
        status: selectedMeeting.status
      });
      alert('Meeting notes updated successfully.');
    } catch (err: any) {
      alert(`Failed to save notes: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE9E3] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E65909] font-bold">
              Leadership & Client Governance
            </span>
            <span className="text-[#8B97A3]">/</span>
            <span className="text-xs text-[#5D646C] dark:text-slate-400">Consultations, Reviews & AI Minutes</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A2F46] dark:text-slate-100 font-bold mt-1">
            Executive Meetings Desk
          </h1>
          <p className="text-xs text-[#5D646C] dark:text-slate-400 mt-0.5">
            Coordinate client advisory calls, audit reviews, and instantly synthesize AI meeting minutes and action items.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100 text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Meetings List (Left) + Meeting Workspace & AI Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Meetings List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46] dark:text-slate-100">
              Scheduled Consultations ({meetings.length})
            </h2>
            <span className="text-[10px] text-[#8B97A3]">Click to inspect or extract AI minutes</span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {meetings.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px]">
                <Calendar className="w-6 h-6 text-[#8B97A3] mx-auto mb-2" />
                <p className="text-xs text-[#5D646C] dark:text-slate-400">No meetings scheduled. Click "Schedule Meeting" to create one.</p>
              </div>
            ) : (
              meetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                const d = new Date(m.scheduled_time);

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeeting(m)}
                    className={`p-3.5 bg-white dark:bg-[#131C2E] border rounded-[3px] cursor-pointer transition-all ${
                      isSelected ? 'border-[#E65909] ring-2 ring-[#E65909]/20 shadow-sm' : 'border-[#C5CBD2] dark:border-slate-800 hover:border-[#8B97A3]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F6F3EE] dark:bg-[#0B1120] text-[#5D646C] dark:text-slate-400 font-bold">
                        {m.meeting_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 mt-2 line-clamp-1">{m.title}</h3>
                    <div className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#8B97A3]" />
                      <span>{m.client_or_lead_name || 'Internal Discussion'}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#ECE9E3] dark:border-slate-800 flex items-center justify-between text-[10px] text-[#8B97A3] font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({m.duration_minutes}m)
                      </span>
                      {m.ai_summary && (
                        <span className="text-purple-700 font-bold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> AI Minutes
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Meeting Details, Notes & AI Summarizer */}
        <div className="lg:col-span-7">
          {selectedMeeting ? (
            <div className="p-4 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ECE9E3] dark:border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                      {selectedMeeting.meeting_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[#8B97A3]">·</span>
                    <span className="text-xs text-[#5D646C] dark:text-slate-400">Client: <strong>{selectedMeeting.client_or_lead_name || 'Internal'}</strong></span>
                  </div>
                  <h2 className="text-xl font-bold font-serif text-[#1A2F46] dark:text-slate-100 mt-1">
                    {selectedMeeting.title}
                  </h2>
                  <div className="text-xs text-[#5D646C] dark:text-slate-400 flex items-center space-x-4 mt-0.5 font-mono">
                    <span>{new Date(selectedMeeting.scheduled_time).toLocaleString('en-IN')}</span>
                    {selectedMeeting.location_or_link && (
                      <span>Location: <strong>{selectedMeeting.location_or_link}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleGenerateSummary(selectedMeeting.id)}
                    disabled={generatingSummary}
                    className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingSummary ? 'Synthesizing...' : 'Generate AI Minutes'}</span>
                  </button>
                </div>
              </div>

              {/* Agenda */}
              {selectedMeeting.agenda && (
                <div className="p-3 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">Planned Agenda</div>
                  <p className="text-xs text-[#1A2F46] dark:text-slate-100 mt-1">{selectedMeeting.agenda}</p>
                </div>
              )}

              {/* Discussion Notes Editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider font-mono">
                    Live Discussion Notes
                  </label>
                  <button
                    onClick={handleUpdateNotes}
                    className="text-[11px] text-[#E65909] hover:underline font-semibold"
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={selectedMeeting.discussion_notes || ''}
                  onChange={(e) => setSelectedMeeting({ ...selectedMeeting, discussion_notes: e.target.value })}
                  placeholder="Record client questions, agreements, tax decisions, or compliance timelines..."
                  className="w-full p-3 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-sans focus:outline-none focus:border-[#E65909]"
                />
              </div>

              {/* AI Generated Minutes & Action Items */}
              {selectedMeeting.ai_summary && (
                <div className="p-4 bg-purple-50/50 rounded-[3px] border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                      Executive AI Minutes & Synthesis
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      Grounded LLM
                    </span>
                  </div>

                  <div className="text-xs text-[#1A2F46] dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {selectedMeeting.ai_summary}
                  </div>

                  {/* Action Items Checklist */}
                  {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
                    <div className="pt-3 border-t border-purple-200">
                      <div className="text-[11px] font-bold text-purple-900 uppercase font-mono mb-1.5">
                        Extracted Action Items
                      </div>
                      <div className="space-y-1">
                        {selectedMeeting.action_items.map((item, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs text-[#1A2F46] dark:text-slate-100">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px]">
              <p className="text-xs text-[#5D646C] dark:text-slate-400">Select a meeting from the left to view notes and generate AI minutes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Schedule Executive Meeting"
        subtitle="Book client consultation, audit review, or internal sync"
      >
        <form onSubmit={handleCreateMeeting} className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Meeting Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 GSTR-2B Mismatch Review & Advisory"
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Meeting Category</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="CLIENT_CONSULTATION">Client Consultation</option>
                <option value="TAX_PLANNING">Tax Planning Session</option>
                <option value="AUDIT_REVIEW">Statutory Audit Review</option>
                <option value="INTERNAL_SYNC">Internal Team Sync</option>
                <option value="BOARD_REVIEW">Board / Leadership Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Client Entity</label>
              <select
                value={customerId || ''}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="">-- Internal / Prospective Client --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Location / Video Link</label>
              <input
                type="text"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                placeholder="Google Meet / Zoom / Office"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Planned Agenda Items</label>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Review notices received&#10;2. Discuss vendor ITC reconciliation&#10;3. Finalize filing timeline"
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Booking...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
