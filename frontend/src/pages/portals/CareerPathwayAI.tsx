import React, { useState } from 'react';
import {
  Compass,
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  Briefcase
} from 'lucide-react';
import { api } from '../../services/api';

export const CareerPathwayAI: React.FC = () => {
  const [currentRole, setCurrentRole] = useState('Articled Assistant / Junior Accountant');
  const [targetRole, setTargetRole] = useState('FP&A Manager');
  const [experienceYears, setExperienceYears] = useState(2);
  const [roadmapData, setRoadmapData] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.generateCareerRoadmap({
        current_role: currentRole,
        target_role: targetRole,
        experience_years: experienceYears
      });
      setRoadmapData(res);
    } catch (err: any) {
      alert(`Roadmap generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A2F46] p-6 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-blue-500/30">
              Talent & Professional Acceleration
            </span>
            <span className="text-xs font-mono text-slate-300">| Module: Career Pathway AI</span>
          </div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            <span>Career Pathway AI</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Data-backed career acceleration and skill-gap roadmap for finance, accounting, statutory tax, and FinTech professionals in India.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-mono">
          <Award className="w-4 h-4 text-blue-400" />
          <div>
            <div className="text-[10px] text-slate-400">Industry Standards</div>
            <div className="font-bold">Ind AS • CA • CFA • Big 4</div>
          </div>
        </div>
      </div>

      {/* Intake & Config Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
            Define Your Progression Vector
          </h3>
          <p className="text-xs text-slate-500">
            Select your current role and desired target position to build a milestone-based certification and compensation roadmap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Current Professional Role
            </label>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
            >
              <option value="Articled Assistant / Junior Accountant">Articled Assistant / Junior Accountant</option>
              <option value="Senior Tax Executive">Senior Tax Executive</option>
              <option value="Semi-Qualified CA / CMA">Semi-Qualified CA / CMA</option>
              <option value="Financial Analyst">Financial Analyst</option>
              <option value="Audit Associate">Audit Associate</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Aspirational Target Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-bold text-navy-950"
            >
              <option value="FP&A Manager">FP&A Manager</option>
              <option value="Statutory Auditor">Statutory Auditor</option>
              <option value="Corporate Tax Manager">Corporate Tax Manager</option>
              <option value="FinTech / Systems Accountant">FinTech / Systems Accountant</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Years of Experience: <strong className="text-navy-950">{experienceYears} Years</strong>
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={experienceYears}
              onChange={(e) => setExperienceYears(parseInt(e.target.value))}
              className="w-full accent-[#1A2F46] mt-2"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-5 py-2.5 bg-[#1A2F46] hover:bg-[#0D2035] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{generating ? 'Mapping Pathway...' : 'Generate Career Acceleration Roadmap'}</span>
          </button>
        </div>
      </div>

      {/* Generated Roadmap Display */}
      {roadmapData && (
        <div className="space-y-6">
          {/* Compensation & Certification Benchmarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Target Salary Trajectory (Indian Market)
              </span>
              <div className="text-xl font-bold font-display text-emerald-700">
                {roadmapData.salary_trajectory}
              </div>
              <p className="text-xs text-slate-500">
                Tier-1 Corporate & MNC Shared Services benchmark for {roadmapData.target_role}.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Recommended Professional Certifications
              </span>
              <div className="text-sm font-bold font-mono text-navy-950">
                {roadmapData.recommended_certifications}
              </div>
              <p className="text-xs text-slate-500">
                High-leverage credentials with immediate employer recognition.
              </p>
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>12-Month Structured Progression Milestones</span>
            </h4>

            <div className="space-y-4">
              {roadmapData.milestones.map((m: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#1A2F46] font-display">
                      {m.phase}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold">
                      Milestone {idx + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.skills.map((skill: string, sIdx: number) => (
                      <span
                        key={sIdx}
                        className="px-2 py-1 bg-white rounded border border-slate-200 text-[11px] font-mono text-slate-700"
                      >
                        ✓ {skill}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-slate-600 pt-1 font-sans">
                    <strong>Action Item:</strong> {m.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
