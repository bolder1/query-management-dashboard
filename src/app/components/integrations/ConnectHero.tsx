import { ShieldCheck, Columns3, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { WIZARD_STEPS } from '../../contexts/IntegrationContext';
import svgPaths from '../../../imports/Container/svg-x88cuihjw';
import imgLine from '../../../imports/Container/c5f24304451b5396e95dff060f5b56a84a67b467.png';
import imgTargetLogo from '../../../imports/Container/6eda90a011b2332f2db252347b18bc9baf1ce044.png';

/** Jira brand mark from the imported design. */
function JiraMark({ className }: { className?: string }) {
  return (
    <div className={className} data-name="Jira">
      <svg className="absolute block inset-0 size-full" fill="none" height="101" preserveAspectRatio="none" viewBox="0 0 101 101" width="101">
        <g id="Jira">
          <g id="back" />
          <g id="Group">
            <path d={svgPaths.p17714c80} fill="#2684FF" id="Shape" />
            <path d={svgPaths.p11e67c00} fill="url(#paint0_linear_0_10)" id="Shape_2" />
            <path d={svgPaths.p1e3fb700} fill="url(#paint1_linear_0_10)" id="Shape_3" />
          </g>
        </g>
        <defs>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_0_10" x1="57.7459" x2="47.4912" y1="32.2486" y2="42.9488">
            <stop offset="0.18" stopColor="#0052CC" />
            <stop offset="1" stopColor="#2684FF" />
          </linearGradient>
          <linearGradient gradientUnits="userSpaceOnUse" id="paint1_linear_0_10" x1="792.911" x2="352.352" y1="736.329" y2="1172.33">
            <stop offset="0.18" stopColor="#0052CC" />
            <stop offset="1" stopColor="#2684FF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/** Plug icon from the imported design. */
function PlugIcon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g clipPath="url(#clip0_0_16)" id="Icon">
          <path d={svgPaths.p3ef57900} id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p2e9182f0} fill="currentColor" id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_0_16">
            <rect fill="currentColor" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

/** Arrow icon from the imported design. */
function ArrowIcon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="Icon">
          <path d="M3.33333 8H12.6667" id="Vector" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1d405500} id="Vector_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

const PROMISES = [
  { icon: Mail, title: 'Emails come with them', body: 'You choose the Jira field the customer’s address is read from.' },
  { icon: Columns3, title: 'Your columns, your names', body: 'Connect Jira fields to the dashboard columns you already use.' },
  { icon: ShieldCheck, title: 'Read-only, always', body: 'Nothing is ever written back to Jira. Disconnect any time.' },
];

/**
 * The first thing an admin sees on Integrations before anything is linked:
 * Jira on one side, the dashboard on the other, and what the setup involves.
 */
export function ConnectHero({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-6 py-10 flex flex-col items-center">
        {/* Illustration: Jira → dashboard */}
        <div className="h-[90px] w-[280px] flex items-center justify-between shrink-0" data-name="Illustration-Canvas">
          <div className="bg-[#c7ddff] size-[64px] rounded-[20px] flex flex-col items-center justify-center shrink-0 drop-shadow-[0px_8px_8px_rgba(99,102,241,0.2)]">
            <JiraMark className="relative h-[63px] w-[64px] shrink-0" />
          </div>

          <div className="flex h-[8px] w-[100px] items-center shrink-0">
            <div className="flex-[1_0_0] h-0 min-w-px relative">
              <div className="absolute inset-[-3px_0_0_0]">
                <img alt="" className="block max-w-none size-full" height="3" src={imgLine} width="100" />
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] size-[64px] rounded-[20px] flex flex-col items-center justify-center shrink-0 drop-shadow-[0px_8px_8px_rgba(15,23,42,0.2)]">
            <img
              alt="Query Management Dashboard"
              className="size-[41px] object-contain pointer-events-none"
              src={imgTargetLogo}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center pt-5">
          Connect with your Jira board
        </h2>

        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 text-center max-w-[460px] pt-1.5">
          Nothing is linked yet. Setup takes {WIZARD_STEPS.length} short steps and you can stop and pick it back up
          at any point — nothing syncs until you say so.
        </p>

        <div className="pt-6">
          <Button
            className="h-11 gap-2 rounded-lg px-4 text-sm font-medium"
            onClick={onConnect}
          >
            <PlugIcon />
            Connect Account
            <ArrowIcon />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
        {PROMISES.map((p) => (
          <div key={p.title} className="px-5 py-4">
            <p.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">{p.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
