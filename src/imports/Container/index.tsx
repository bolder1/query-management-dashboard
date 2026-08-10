import svgPaths from "./svg-x88cuihjw";
import imgLine from "./c5f24304451b5396e95dff060f5b56a84a67b467.png";
import imgImageLogo from "./6eda90a011b2332f2db252347b18bc9baf1ce044.png";

function Jira({ className }: { className?: string }) {
  return (
    <div className={className || "relative size-[101px]"} data-name="Jira">
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

function BeeterNode() {
  return (
    <div className="bg-[#c7ddff] content-stretch drop-shadow-[0px_8px_8px_rgba(99,102,241,0.2)] flex flex-col items-center justify-center relative rounded-[20px] shrink-0 size-[64px]" data-name="Beeter-Node">
      <Jira className="h-[63px] relative shrink-0 w-[64px]" />
    </div>
  );
}

function ConnectionLineWrapper() {
  return (
    <div className="content-stretch flex h-[8px] items-center relative shrink-0 w-[100px]" data-name="Connection-Line-Wrapper">
      <div className="flex-[1_0_0] h-0 min-w-px relative" data-name="Line">
        <div className="absolute inset-[-3px_0_0_0]">
          <img alt="" className="block max-w-none size-full" height="3" src={imgLine} width="100" />
        </div>
      </div>
    </div>
  );
}

function ImageLogo() {
  return (
    <div className="relative shrink-0 size-[41px]" data-name="Image (Logo)">
      <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={imgImageLogo} />
    </div>
  );
}

function TargetNode() {
  return (
    <div className="bg-[#0f172a] content-stretch drop-shadow-[0px_8px_8px_rgba(15,23,42,0.2)] flex flex-col items-center justify-center relative rounded-[20px] shrink-0 size-[64px]" data-name="Target-Node">
      <ImageLogo />
    </div>
  );
}

function IllustrationCanvas() {
  return (
    <div className="h-[90px] relative shrink-0 w-[280px]" data-name="Illustration-Canvas">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative size-full">
        <BeeterNode />
        <ConnectionLineWrapper />
        <TargetNode />
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="h-[48px] relative shrink-0 w-[718.4px]" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center pt-[20px] relative size-full">
        <p className="[word-break:break-word] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[28px] not-italic relative shrink-0 text-[#101828] text-[18px] text-center whitespace-nowrap">Connect with your Jira board</p>
      </div>
    </div>
  );
}

function ParagraphMargin() {
  return (
    <div className="relative shrink-0 w-full" data-name="Paragraph:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-center pt-[6px] relative size-full">
        <p className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#6a7282] text-[14px] text-center w-[448px]">Nothing is linked yet. Once connected, your Jira issues land in Query Results with the fields you choose. Pick how you want to sign in.</p>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g clipPath="url(#clip0_0_16)" id="Icon">
          <path d={svgPaths.p3ef57900} id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p2e9182f0} fill="white" id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
        <defs>
          <clipPath id="clip0_0_16">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function IconMargin() {
  return (
    <div className="relative shrink-0" data-name="Icon:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start pr-[8px] relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" height="16" preserveAspectRatio="none" viewBox="0 0 16 16" width="16">
        <g id="Icon">
          <path d="M3.33333 8H12.6667" id="Vector" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          <path d={svgPaths.p1d405500} id="Vector_2" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function IconMargin1() {
  return (
    <div className="relative shrink-0" data-name="Icon:margin">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start pl-[8px] relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute bg-[#030213] content-stretch flex gap-[8px] h-[44px] items-center justify-center left-[260.88px] px-[12px] py-[8px] rounded-[8px] top-[28px]" data-name="Button">
      <IconMargin />
      <p className="[word-break:break-word] font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[14px] text-center text-white whitespace-nowrap">Connect Account</p>
      <IconMargin1 />
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[72px] relative shrink-0 w-full" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Button />
      </div>
    </div>
  );
}

export default function Container() {
  return (
    <div className="bg-white content-stretch flex flex-col items-center px-[24.8px] py-[40.8px] relative rounded-[16px] size-full" data-name="Container">
      <div aria-hidden className="absolute border-[#e5e7eb] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[16px]" />
      <IllustrationCanvas />
      <Heading />
      <ParagraphMargin />
      <Container1 />
    </div>
  );
}