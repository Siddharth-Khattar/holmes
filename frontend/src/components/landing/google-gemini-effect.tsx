// ABOUTME: Animated SVG path component that creates a flowing line effect on scroll.
// ABOUTME: Used with scroll-linked motion values to animate 5 colored paths converging toward a CTA.

"use client";

import { cn } from "@/lib/utils";
import {
  motion,
  useTransform,
  type MotionValue,
  type Transition,
} from "motion/react";

const transition: Transition = {
  duration: 0,
  ease: "linear",
};

// Media type configuration (LEFT side) - order matches path order (pink, orange, light blue, cyan, blue)
// Y positions: 663, 587.5, 514, 438.5, 364
const MEDIA_LABELS = [
  {
    label: "Case Files",
    color: "#FFB7C5",
    y: 663,
    icon: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z",
  },
  {
    label: "Video",
    color: "#FFDDB7",
    y: 587.5,
    icon: "m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z",
  },
  {
    label: "Audio",
    color: "#B1C5FF",
    y: 514,
    icon: "M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z",
  },
  {
    label: "Images",
    color: "#4FABFF",
    y: 438.5,
    icon: "m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
  },
  {
    label: "Law Books",
    color: "#076EFF",
    y: 364,
    icon: "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  },
];

// Output/Solution labels (RIGHT side) - what Holmes provides
// Ending Y positions: 662.5, 588, 513, 439, 364
const OUTPUT_LABELS = [
  {
    label: "Timeline",
    color: "#FFB7C5",
    y: 662.5,
    // Clock/timeline icon
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  },
  {
    label: "Clarity",
    color: "#FFDDB7",
    y: 588,
    // Eye/clarity icon
    icon: "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
  {
    label: "Insights",
    color: "#B1C5FF",
    y: 513,
    // Lightbulb/insights icon
    icon: "M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
  },
  {
    label: "Connections",
    color: "#4FABFF",
    y: 439,
    // Network/graph icon
    icon: "M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z",
  },
  {
    label: "Analysis",
    color: "#076EFF",
    y: 364,
    // Chart/analysis icon
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
  },
];

interface LabelProps {
  label: string;
  color: string;
  y: number;
  icon: string;
  pathLength: MotionValue<number>;
}

// Left side labels (input media types)
function MediaLabel({ label, color, y, icon, pathLength }: LabelProps) {
  const opacity = useTransform(pathLength, [0, 0.2, 0.4], [0, 0.5, 1]);
  const xOffset = useTransform(pathLength, [0, 0.2, 0.4], [-30, -15, 0]);

  // Position label above the thread (subtract 35 to place above the path)
  const labelY = y - 35;

  return (
    <motion.g style={{ opacity, x: xOffset }}>
      {/* Icon */}
      <svg x={10} y={labelY - 12} width={24} height={24} viewBox="0 0 24 24">
        <path
          d={icon}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Label text */}
      <text
        x={40}
        y={labelY + 5}
        fill={color}
        fontSize={14}
        fontWeight={500}
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </motion.g>
  );
}

// Right side labels (output solutions)
function OutputLabel({ label, color, y, icon, pathLength }: LabelProps) {
  // Fade in later in the animation (after paths have progressed further)
  const opacity = useTransform(pathLength, [0.5, 0.7, 0.9], [0, 0.5, 1]);
  const xOffset = useTransform(pathLength, [0.5, 0.7, 0.9], [30, 15, 0]);

  // Position label above the thread
  const labelY = y - 35;

  return (
    <motion.g style={{ opacity, x: xOffset }}>
      {/* Label text (text first, then icon for right alignment) */}
      <text
        x={1320}
        y={labelY + 5}
        fill={color}
        fontSize={14}
        fontWeight={500}
        fontFamily="system-ui, sans-serif"
        textAnchor="end"
      >
        {label}
      </text>
      {/* Icon */}
      <svg x={1330} y={labelY - 12} width={24} height={24} viewBox="0 0 24 24">
        <path
          d={icon}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.g>
  );
}

interface GoogleGeminiEffectProps {
  pathLengths: MotionValue<number>[];
  title?: string;
  description?: string;
  className?: string;
}

export function GoogleGeminiEffect({
  pathLengths,
  title,
  description,
  className,
}: GoogleGeminiEffectProps) {
  return (
    <div
      className={cn(
        "sticky top-0 h-screen flex flex-col items-center justify-center",
        className,
      )}
    >
      {/* Title and description at top of sticky container */}
      {(title || description) && (
        <div className="absolute top-20 left-0 right-0 z-30 px-4 sm:px-6 lg:px-8 pointer-events-none">
          <div className="mx-auto max-w-3xl text-center">
            {title && (
              <h2 className="font-serif text-3xl font-medium tracking-tight text-smoke sm:text-4xl lg:text-5xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-smoke/70 sm:text-xl">
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Button centered vertically on the gemini effect */}
      <div className="absolute inset-0 flex items-center justify-center z-30 mt-24">
        <button
          type="button"
          className="bg-smoke/95 hover:bg-smoke px-8 py-4 text-lg font-medium text-charcoal rounded-full transition-colors cursor-pointer"
          onClick={() => console.log("Button clicked!")}
        >
          Start Your Investigation
        </button>
      </div>
      <svg
        width="1440"
        height="890"
        viewBox="0 0 1440 890"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-h-[70vh] pointer-events-none"
      >
        {/* Media type labels - positioned at path start points (desktop only via CSS) */}
        <g className="hidden lg:block">
          {MEDIA_LABELS.map((media, index) => (
            <MediaLabel
              key={media.label}
              label={media.label}
              color={media.color}
              y={media.y}
              icon={media.icon}
              pathLength={pathLengths[index]}
            />
          ))}
        </g>

        {/* Output/Solution labels - positioned at path end points (desktop only) */}
        <g className="hidden lg:block">
          {OUTPUT_LABELS.map((output, index) => (
            <OutputLabel
              key={output.label}
              label={output.label}
              color={output.color}
              y={output.y}
              icon={output.icon}
              pathLength={pathLengths[index]}
            />
          ))}
        </g>

        {/* Animated paths - Pink (Case Files) */}
        <motion.path
          d="M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5"
          stroke="#FFB7C5"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: pathLengths[0] }}
          transition={transition}
        />
        {/* Orange (Video) */}
        <motion.path
          d="M0 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1440 588"
          stroke="#FFDDB7"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: pathLengths[1] }}
          transition={transition}
        />
        {/* Light Blue (Audio) */}
        <motion.path
          d="M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235"
          stroke="#B1C5FF"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: pathLengths[2] }}
          transition={transition}
        />
        {/* Cyan (Images) */}
        <motion.path
          d="M0 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1439.5 439"
          stroke="#4FABFF"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: pathLengths[3] }}
          transition={transition}
        />
        {/* Blue (Law Books) */}
        <motion.path
          d="M0.5 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1439 364"
          stroke="#076EFF"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          style={{ pathLength: pathLengths[4] }}
          transition={transition}
        />

        {/* Blurred background paths for glow effect - Pink */}
        <path
          d="M0 663C145.5 663 191 666.265 269 647C326.5 630 339.5 621 397.5 566C439 531.5 455 529.5 490 523C509.664 519.348 521 503.736 538 504.236C553.591 504.236 562.429 514.739 584.66 522.749C592.042 525.408 600.2 526.237 607.356 523.019C624.755 515.195 641.446 496.324 657 496.735C673.408 496.735 693.545 519.572 712.903 526.769C718.727 528.934 725.184 528.395 730.902 525.965C751.726 517.115 764.085 497.106 782 496.735C794.831 496.47 804.103 508.859 822.469 518.515C835.13 525.171 850.214 526.815 862.827 520.069C875.952 513.049 889.748 502.706 903.5 503.736C922.677 505.171 935.293 510.562 945.817 515.673C954.234 519.76 963.095 522.792 972.199 524.954C996.012 530.611 1007.42 534.118 1034 549C1077.5 573.359 1082.5 594.5 1140 629C1206 670 1328.5 662.5 1440 662.5"
          stroke="#FFB7C5"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        {/* Orange */}
        <path
          d="M0 587.5C147 587.5 277 587.5 310 573.5C348 563 392.5 543.5 408 535C434 523.5 426 526.235 479 515.235C494 512.729 523 510.435 534.5 512.735C554.5 516.735 555.5 523.235 576 523.735C592 523.735 616 496.735 633 497.235C648.671 497.235 661.31 515.052 684.774 524.942C692.004 527.989 700.2 528.738 707.349 525.505C724.886 517.575 741.932 498.33 757.5 498.742C773.864 498.742 791.711 520.623 810.403 527.654C816.218 529.841 822.661 529.246 828.451 526.991C849.246 518.893 861.599 502.112 879.5 501.742C886.47 501.597 896.865 506.047 907.429 510.911C930.879 521.707 957.139 519.639 982.951 520.063C1020.91 520.686 1037.5 530.797 1056.5 537C1102.24 556.627 1116.5 570.704 1180.5 579.235C1257.5 589.5 1279 587 1440 588"
          stroke="#FFDDB7"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        {/* Light Blue */}
        <path
          d="M0 514C147.5 514.333 294.5 513.735 380.5 513.735C405.976 514.94 422.849 515.228 436.37 515.123C477.503 514.803 518.631 506.605 559.508 511.197C564.04 511.706 569.162 512.524 575 513.735C588 516.433 616 521.702 627.5 519.402C647.5 515.402 659 499.235 680.5 499.235C700.5 499.235 725 529.235 742 528.735C757.654 528.735 768.77 510.583 791.793 500.59C798.991 497.465 807.16 496.777 814.423 499.745C832.335 507.064 850.418 524.648 866 524.235C882.791 524.235 902.316 509.786 921.814 505.392C926.856 504.255 932.097 504.674 937.176 505.631C966.993 511.248 970.679 514.346 989.5 514.735C1006.3 515.083 1036.5 513.235 1055.5 513.235C1114.5 513.235 1090.5 513.235 1124 513.235C1177.5 513.235 1178.99 514.402 1241 514.402C1317.5 514.402 1274.5 512.568 1440 513.235"
          stroke="#B1C5FF"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        {/* Cyan */}
        <path
          d="M0 438.5C150.5 438.5 261 438.318 323.5 456.5C351 464.5 387.517 484.001 423.5 494.5C447.371 501.465 472 503.735 487 507.735C503.786 512.212 504.5 516.808 523 518.735C547 521.235 564.814 501.235 584.5 501.235C604.5 501.235 626 529.069 643 528.569C658.676 528.569 672.076 511.63 695.751 501.972C703.017 499.008 711.231 498.208 718.298 501.617C735.448 509.889 751.454 529.98 767 529.569C783.364 529.569 801.211 507.687 819.903 500.657C825.718 498.469 832.141 499.104 837.992 501.194C859.178 508.764 873.089 523.365 891 523.735C907.8 524.083 923 504.235 963 506.735C1034.5 506.735 1047.5 492.68 1071 481.5C1122.5 457 1142.23 452.871 1185 446.5C1255.5 436 1294 439 1439.5 439"
          stroke="#4FABFF"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />
        {/* Blue */}
        <path
          d="M0.5 364C145.288 362.349 195 361.5 265.5 378C322 391.223 399.182 457.5 411 467.5C424.176 478.649 456.916 491.677 496.259 502.699C498.746 503.396 501.16 504.304 503.511 505.374C517.104 511.558 541.149 520.911 551.5 521.236C571.5 521.236 590 498.736 611.5 498.736C631.5 498.736 652.5 529.236 669.5 528.736C685.171 528.736 697.81 510.924 721.274 501.036C728.505 497.988 736.716 497.231 743.812 500.579C761.362 508.857 778.421 529.148 794 528.736C810.375 528.736 829.35 508.68 848.364 502.179C854.243 500.169 860.624 500.802 866.535 502.718C886.961 509.338 898.141 519.866 916 520.236C932.8 520.583 934.5 510.236 967.5 501.736C1011.5 491 1007.5 493.5 1029.5 480C1069.5 453.5 1072 440.442 1128.5 403.5C1180.5 369.5 1275 360.374 1439 364"
          stroke="#076EFF"
          strokeWidth="2"
          fill="none"
          pathLength={1}
          filter="url(#blurMe)"
        />

        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
