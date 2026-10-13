import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Key,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { sendTestEmail, getEmailConfigStatus } from '../../services/emailService';
import { showToast } from '../Toast';

export default function EmailAutomationTestPanel() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusResult, setStatusResult] = useState(null); // { type: 'success' | 'error', message, id, details }
  const [configStatus, setConfigStatus] = useState(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Check backend server configuration status on mount
  const checkStatus = async () => {
    setCheckingConfig(true);
    try {
      const status = await getEmailConfigStatus();
      setConfigStatus(status);
    } catch (err) {
      console.warn('Config check failed:', err);
    } finally {
      setCheckingConfig(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setStatusResult(null);

    const emailTrimmed = recipientEmail.trim();
    if (!emailTrimmed) {
      setStatusResult({
        type: 'error',
        message: 'Please enter a recipient email address.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await sendTestEmail(emailTrimmed);

      setStatusResult({
        type: 'success',
        message: 'Test email sent successfully via Resend!',
        id: response.id || 'N/A',
        recipient: emailTrimmed,
        timestamp: response.timestamp || new Date().toISOString(),
      });

      showToast('Test email sent successfully!', 'success');
    } catch (err) {
      console.error('Email send error:', err);
      const errorMsg = err.message || 'Failed to dispatch email.';

      let helpfulHint = '';
      if (errorMsg.includes('RESEND_API_KEY') || errorMsg.includes('MISSING_API_KEY')) {
        helpfulHint = 'Configure RESEND_API_KEY in your server-side .env file or restart your dev server (npm run dev).';
      } else if (errorMsg.toLowerCase().includes('testing emails to your own email') || errorMsg.toLowerCase().includes('invalid `to` field') || errorMsg.includes('example.com')) {
        helpfulHint = 'Resend sandbox tip: When sending from onboarding@resend.dev, Resend only delivers to your registered account email or delivered@resend.dev. To send to any recipient, verify your domain in Resend.';
      }

      setStatusResult({
        type: 'error',
        message: errorMsg,
        hint: helpfulHint,
      });

      showToast('Failed to send test email', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-wider text-[#FF2B2B] mb-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-[#FF2B2B]" />
          <span>Secure Transactional Infrastructure</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Resend Email Automation Desk
        </h2>
        <p className="text-sm text-[#B0B0B0] mt-1 max-w-3xl">
          Dispatch and verify transactional emails through BloodBridge's secure backend and Firebase Cloud Functions.
          API credentials are strictly confined to the server environment and never exposed to client-side code.
        </p>
      </div>

      {/* Security Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Key Security */}
        <div className="bg-[#111114] border border-[#22222a] p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Frontend Zero-Secret</h4>
            <p className="text-[11px] text-[#A0A0A8] mt-1 leading-relaxed">
              Resend API key is never bundled in React/Vite assets. All dispatches route through server-side functions.
            </p>
          </div>
        </div>

        {/* Card 2: Server Backend Status */}
        <div className="bg-[#111114] border border-[#22222a] p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Server Status</h4>
              <button
                onClick={checkStatus}
                title="Refresh Status"
                className="text-[#707078] hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${checkingConfig ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[11px] text-[#A0A0A8] mt-1">
              Sender: <span className="font-mono text-white text-[10px]">{configStatus?.sender || 'BloodBridge <onboarding@resend.dev>'}</span>
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${configStatus?.isKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="text-[10px] font-mono text-[#B0B0B8]">
                {checkingConfig ? 'Checking...' : configStatus?.isKeyConfigured ? 'RESEND_API_KEY Active' : 'RESEND_API_KEY Not Detected'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Engine */}
        <div className="bg-[#111114] border border-[#22222a] p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#E50914]/10 border border-[#E50914]/20 text-[#FF2B2B] mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resend Node.js SDK</h4>
            <p className="text-[11px] text-[#A0A0A8] mt-1 leading-relaxed">
              Official SDK engine connected for reliable transactional dispatch and rapid delivery observability.
            </p>
          </div>
        </div>
      </div>

      {/* Main Testing Box */}
      <div className="bg-[#0e0e12] border border-[#202028] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,rgba(229,9,20,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF2B2B]">
              Phase 1 Diagnostic
            </span>
            <span className="text-xs text-[#707078] font-mono">Backend: sendTestEmail</span>
          </div>

          <h3 className="text-xl font-black text-white">
            Dispatch Test Transactional Email
          </h3>
          <p className="text-xs text-[#909098] mt-1">
            Send an end-to-end test verification to ensure your Resend API credentials, sender address, and delivery pipeline are functioning smoothly.
          </p>

          <form onSubmit={handleSendTest} className="mt-6 space-y-4">
            <div>
              <label htmlFor="test-recipient-email" className="block text-xs font-bold text-[#E0E0E8] uppercase tracking-wider mb-2">
                Recipient Email Address <span className="text-[#FF2B2B]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707078]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="test-recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g., your-email@domain.com"
                  disabled={isLoading}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#16161c] border border-[#282834] rounded-xl text-sm text-white placeholder-[#606068] focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] transition-all disabled:opacity-50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] text-[#707078] uppercase font-bold tracking-wider">Sandbox Quick Fill:</span>
                <button
                  type="button"
                  onClick={() => setRecipientEmail('delivered@resend.dev')}
                  className="px-2.5 py-1 rounded-lg bg-[#1a1a24] hover:bg-[#252535] border border-white/10 text-[11px] text-[#38bdf8] font-mono transition-colors"
                >
                  delivered@resend.dev
                </button>
              </div>
              <p className="text-[11px] text-[#707078] mt-1.5 flex items-center gap-1">
                <Info className="w-3 h-3 text-[#A0A0A8] flex-shrink-0" />
                <span>
                  Using Resend's trial sender (<code className="text-[#B0B0B8]">onboarding@resend.dev</code>)? Send to your registered Resend email or <code className="text-[#38bdf8]">delivered@resend.dev</code>.
                </span>
              </p>
            </div>

            <button
              id="btn-send-test-email"
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF2B2B] to-[#E50914] hover:from-[#ff4444] hover:to-[#f0101d] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(229,9,20,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Test Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </form>

          {/* Loading State Banner */}
          {isLoading && (
            <div className="mt-6 p-4 rounded-2xl bg-[#14141e] border border-[#2a2a3e] flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-[#38bdf8] animate-spin flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">Communicating with Resend API Server...</p>
                <p className="text-[11px] text-[#909098]">
                  Packaging transactional payload and dispatching via official Node.js SDK.
                </p>
              </div>
            </div>
          )}

          {/* Success Message Banner */}
          {statusResult?.type === 'success' && (
            <div className="mt-6 p-5 rounded-2xl bg-[#0c1a14] border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)] animate-fadeIn">
              <div className="flex items-start gap-3.5">
                <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">
                    {statusResult.message}
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Your email automation system is connected successfully.
                  </p>

                  <div className="mt-3.5 pt-3.5 border-t border-emerald-500/20 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#86efac]">
                      <span className="text-[#94a3b8]">Recipient:</span>
                      <span className="text-white font-medium">{statusResult.recipient}</span>
                    </div>

                    <div className="flex items-center justify-between text-[#86efac]">
                      <span className="text-[#94a3b8]">Resend Message ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-medium">{statusResult.id}</span>
                        <button
                          onClick={() => handleCopyId(statusResult.id)}
                          className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300 transition-colors"
                          title="Copy ID"
                        >
                          {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[#86efac]">
                      <span className="text-[#94a3b8]">Subject:</span>
                      <span className="text-white font-medium">BloodBridge Email Automation Test</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Banner */}
          {statusResult?.type === 'error' && (
            <div className="mt-6 p-5 rounded-2xl bg-[#1e0d0f] border border-[#E50914]/40 shadow-[0_0_25px_rgba(229,9,20,0.15)] animate-fadeIn">
              <div className="flex items-start gap-3.5">
                <div className="p-1.5 rounded-xl bg-[#E50914]/20 text-[#FF2B2B] flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">
                    Delivery Dispatch Failed
                  </h4>
                  <p className="text-xs text-red-200 mt-1 leading-relaxed">
                    {statusResult.message}
                  </p>

                  {statusResult.hint && (
                    <div className="mt-3 pt-3 border-t border-[#E50914]/20">
                      <p className="text-[11px] text-amber-300/90 leading-relaxed">
                        <strong className="text-amber-200">Tip:</strong> {statusResult.hint}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration & Quick Start Guide */}
      <div className="bg-[#111116] border border-[#22222c] rounded-2xl p-6 space-y-4">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <span>Server-Side Secret Setup Checklist</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#16161e] p-4 rounded-xl border border-white/5 space-y-2">
            <span className="font-bold text-white block">1. Local Development (`.env` in project root)</span>
            <p className="text-[#A0A0A8]">
              Add your Resend API key to the server environment (without the <code className="text-red-400">VITE_</code> prefix to prevent client bundling):
            </p>
            <pre className="p-2.5 rounded-lg bg-[#0a0a0e] text-[#38bdf8] font-mono text-[11px] overflow-x-auto border border-white/5">
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=BloodBridge &lt;onboarding@resend.dev&gt;
            </pre>
          </div>

          <div className="bg-[#16161e] p-4 rounded-xl border border-white/5 space-y-2">
            <span className="font-bold text-white block">2. Firebase Cloud Functions (`functions/`)</span>
            <p className="text-[#A0A0A8]">
              Deploy to Firebase Cloud Functions securely via Firebase CLI:
            </p>
            <pre className="p-2.5 rounded-lg bg-[#0a0a0e] text-[#38bdf8] font-mono text-[11px] overflow-x-auto border border-white/5">
firebase functions:secrets:set RESEND_API_KEY
firebase deploy --only functions
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
