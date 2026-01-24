// ABOUTME: Hero section for the Holmes landing page with parallax scroll effects.
// ABOUTME: Displays brand taglines, Sherlock quote, video placeholder, and primary CTA.

"use client";

import { forwardRef, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";

interface VideoPlayerProps {
  src: string;
  onEnded: () => void;
}

/**
 * Client-only video player component.
 * Wrapped with forwardRef to allow parent to control playback.
 */
const VideoPlayerBase = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayerBase({ src, onEnded }, ref) {
    return (
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        playsInline
        onEnded={onEnded}
      />
    );
  },
);

// Dynamically import with SSR disabled to prevent hydration mismatch
const VideoPlayer = dynamic(() => Promise.resolve(VideoPlayerBase), {
  ssr: false,
});

/**
 * Hero section with parallax scroll effect and brand messaging.
 *
 * Layout: Text content at top, video below with smooth scale-up on scroll.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePauseClick = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  // Track video element for scale animation - completes when video is centered
  const { scrollYProgress: videoProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"],
  });

  // Video scale - starts normal, enlarges to 1.4x when centered in viewport
  const videoScale = useTransform(videoProgress, [0, 1], [1, 1.4]);

  return (
    <section ref={sectionRef} className="relative">
      {/* Text content */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-52 pb-32 text-center sm:px-6 sm:pt-64 sm:pb-40 lg:px-8">
        {/* Primary Tagline */}
        <motion.h1
          className="font-serif text-6xl font-medium tracking-tight text-smoke sm:text-7xl md:text-8xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          Deduce. Discover. Decide.
        </motion.h1>

        {/* Secondary Tagline - Sherlock Quote */}
        <motion.blockquote
          className="mx-auto mt-8 max-w-2xl font-sans"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
        >
          <p className="text-xl italic text-smoke/70 sm:text-2xl leading-relaxed">
            &ldquo;When you have eliminated the impossible, whatever remains,
            however improbable, must be the truth.&rdquo;
          </p>
          <footer className="mt-4 text-base font-medium text-accent">
            — Sherlock Holmes
          </footer>
        </motion.blockquote>

        {/* Primary CTA */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
        >
          <button
            type="button"
            className="liquid-glass-button px-8 py-4 text-lg font-medium text-smoke"
          >
            Start Your Investigation
          </button>
        </motion.div>
      </div>

      {/* Video section - normal scroll with scale animation */}
      <div className="relative z-20 flex justify-center px-4 pb-40 sm:px-6 sm:pb-52 lg:px-8">
        <motion.div
          ref={containerRef}
          className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-smoke/10"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.9 }}
          style={{ scale: videoScale }}
        >
          {/* Video Element - client-only to avoid hydration mismatch */}
          <VideoPlayer
            ref={videoRef}
            src="/video.mp4"
            onEnded={handleVideoEnd}
          />

          {/* Play Button Overlay - shown when not playing */}
          {!isPlaying && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-charcoal/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="group relative flex h-14 items-center gap-3 px-6 sm:h-16 sm:gap-4 sm:px-8"
                aria-label="Play demo video"
                onClick={handlePlayClick}
              >
                {/* Outer border with glow */}
                <span className="absolute inset-0 rounded-xl border border-smoke/20 transition-all duration-300 group-hover:border-smoke/40 group-hover:shadow-[0_0_30px_rgba(248,247,244,0.15)]" />

                {/* Glass background */}
                <span className="absolute inset-[1px] rounded-xl bg-smoke/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-smoke/15" />

                {/* Play icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="relative z-10 h-5 w-5 text-smoke sm:h-6 sm:w-6"
                >
                  <path
                    d="M8 5.5v13l10-6.5L8 5.5z"
                    fill="currentColor"
                    opacity="0.9"
                  />
                </svg>

                {/* Label */}
                <span className="relative z-10 text-sm font-medium text-smoke sm:text-base">
                  Play Video
                </span>
              </button>
            </motion.div>
          )}

          {/* Pause Overlay - shown when playing, click to pause */}
          {isPlaying && (
            <button
              type="button"
              className="absolute inset-0 cursor-pointer"
              aria-label="Pause video"
              onClick={handlePauseClick}
            />
          )}
        </motion.div>
      </div>
    </section>
  );
}
