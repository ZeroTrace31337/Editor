/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HelpCircle,
  BookOpen,
  Keyboard,
  MessageSquare,
  Info,
  Shield,
  FileText,
  Cpu,
  Zap,
} from 'lucide-react';

interface HomeFooterProps {
  onOpenShortcuts: () => void;
  onOpenTutorials: () => void;
  onOpenAbout: () => void;
}

export const HomeFooter: React.FC<HomeFooterProps> = ({
  onOpenShortcuts,
  onOpenTutorials,
  onOpenAbout,
}) => {
  return (
    <footer className="mt-8 pt-6 pb-8 border-t border-zinc-850 text-xs text-zinc-400 select-none">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Quick links */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2">
          <button
            onClick={onOpenTutorials}
            className="hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Tutorials & Docs</span>
          </button>

          <button
            onClick={onOpenShortcuts}
            className="hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Keyboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>Keyboard Shortcuts</span>
          </button>

          <a
            href="#help"
            onClick={(e) => {
              e.preventDefault();
              onOpenTutorials();
            }}
            className="hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Help Center</span>
          </a>

          <a
            href="#feedback"
            onClick={(e) => {
              e.preventDefault();
              alert('Thank you for using VeeCut Pro! We welcome your feedback.');
            }}
            className="hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Feedback</span>
          </a>

          <button
            onClick={onOpenAbout}
            className="hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-zinc-400" />
            <span>About VeeCut</span>
          </button>

          <span className="hover:text-zinc-200 transition flex items-center gap-1 cursor-pointer">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>Privacy</span>
          </span>

          <span className="hover:text-zinc-200 transition flex items-center gap-1 cursor-pointer">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Terms</span>
          </span>
        </div>

        {/* Right: Engine Status & Version */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>GPU: WebGL2 Float32</span>
          </div>
          <span>VeeCut Pro v3.4.2</span>
        </div>
      </div>
    </footer>
  );
};
