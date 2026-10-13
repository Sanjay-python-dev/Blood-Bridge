import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Wrench, Lock } from 'lucide-react';
import EmailAutomationTestPanel from '../components/admin/EmailAutomationTestPanel';

export default function DevEmailTest() {
  return (
    <div className="min-h-screen bg-[#07070a] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-8">
          <Link
            to="/admin-dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#A0A0A8] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Admin Console</span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#161620] border border-white/10 text-[11px] font-mono text-[#38bdf8]">
            <Wrench className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Development Diagnostics Suite</span>
          </div>
        </div>

        {/* Panel Content */}
        <EmailAutomationTestPanel />
      </div>
    </div>
  );
}
