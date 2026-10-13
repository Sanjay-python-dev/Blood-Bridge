import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin, ArrowUp } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  const location = useLocation();

  // Hide footer on hospital pages and admin pages for clean, dedicated dashboard view
  if (
    location.pathname.startsWith('/hospital') ||
    location.pathname.startsWith('/admin')
  ) {
    return null;
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[rgba(10,10,14,0.78)] backdrop-blur-2xl border-t border-white/[0.08] relative z-10 text-white">
      {/* Subtle top glow line */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#E50914]/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <Logo size="large" />
            <p className="text-sm text-[#B0B0B0] max-w-sm leading-relaxed pt-2">
              Blood Bridge is a platform that connects blood donors with patients and hospitals who need blood. Our mission is to bridge lives and build a community where no one has to suffer for lack of timely blood.
            </p>

            <div className="pt-2 space-y-2 text-xs text-[#B0B0B0]">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#E50914] flex-shrink-0" />
                <span>Headquarters: Tamil Nadu, India</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#E50914] flex-shrink-0" />
                <span>support@bloodbridge.com</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#FF2B2B] flex-shrink-0" />
                <span className="text-white font-semibold">24/7 Emergency Line: 1800-BLOOD-HELP</span>
              </div>
            </div>
          </div>

          {/* Col 3: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold tracking-wider uppercase text-white border-l-2 border-[#E50914] pl-2.5">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm text-[#B0B0B0]">
              <li>
                <Link to="/" className="hover:text-[#FF2B2B] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/find-blood" className="hover:text-[#FF2B2B] transition-colors">
                  Find Blood
                </Link>
              </li>
              <li>
                <Link to="/donate-blood" className="hover:text-[#FF2B2B] transition-colors">
                  Donate Blood
                </Link>
              </li>
              <li>
                <Link to="/request-blood" className="hover:text-[#FF2B2B] transition-colors">
                  Request Blood
                </Link>
              </li>
              <li>
                <Link to="/donor-dashboard" className="hover:text-[#FF2B2B] transition-colors">
                  Donor Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Support & Legal */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold tracking-wider uppercase text-white border-l-2 border-[#E50914] pl-2.5">
              Support
            </h4>
            <ul className="space-y-2.5 text-sm text-[#B0B0B0]">
              <li>
                <Link to="/about" className="hover:text-[#FF2B2B] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#FF2B2B] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <span className="hover:text-[#FF2B2B] cursor-pointer transition-colors" title="Privacy Policy">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-[#FF2B2B] cursor-pointer transition-colors" title="Terms & Conditions">
                  Terms of Service
                </span>
              </li>
              <li>
                <Link to="/admin-dashboard" className="hover:text-[#FF2B2B] transition-colors">
                  Admin Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Socials & Mission pill */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold tracking-wider uppercase text-white border-l-2 border-[#E50914] pl-2.5">
              Connect With Us
            </h4>
            <p className="text-xs text-[#B0B0B0]">
              Follow our community drives and donor appreciation stories.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {/* Instagram */}
              <a
                href="#instagram"
                aria-label="Instagram"
                className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2a2a2a] hover:border-[#E50914] text-[#B0B0B0] hover:text-[#FF2B2B] flex items-center justify-center transition-all hover:scale-105 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              {/* Facebook */}
              <a
                href="#facebook"
                aria-label="Facebook"
                className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2a2a2a] hover:border-[#E50914] text-[#B0B0B0] hover:text-[#FF2B2B] flex items-center justify-center transition-all hover:scale-105 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
              </a>
              {/* Twitter / X */}
              <a
                href="#twitter"
                aria-label="Twitter"
                className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2a2a2a] hover:border-[#E50914] text-[#B0B0B0] hover:text-[#FF2B2B] flex items-center justify-center transition-all hover:scale-105 shadow-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111111] border border-[#222222] mt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FF2B2B]">
                <Heart className="w-4 h-4 fill-[#FF2B2B]" />
                <span>Every Drop Counts</span>
              </div>
              <p className="text-[11px] text-[#737373] mt-1">
                Your donation can save up to 3 lives today.
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#737373]">
          <p>© 2026 Blood Bridge. All Rights Reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer transition-colors">Security</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer transition-colors">Accessibility</span>
            <button
              onClick={scrollToTop}
              className="ml-4 p-2 rounded-lg bg-[#141414] hover:bg-[#E50914] text-white transition-colors"
              title="Back to Top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
