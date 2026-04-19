'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Captions } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title: string;
  transcript?: string;
  thumbnailUrl?: string;
}

export function VideoPlayer({ src, title, transcript, thumbnailUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);

  function togglePlay() {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function toggleMute() {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(isNaN(percent) ? 0 : percent);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!videoRef.current) return;
    const time = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(parseFloat(e.target.value));
  }

  return (
    <div className="w-full">
      {/* Video */}
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          src={src}
          poster={thumbnailUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
          playsInline
          aria-label={title}
        >
          {transcript && (
            <track kind="captions" src="#" label="English" default />
          )}
        </video>

        {/* Big play button overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group min-h-0 min-w-0"
            aria-label="Play video"
          >
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play className="w-8 h-8 text-blue-600 ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="bg-slate-800 px-4 pb-3 pt-2">
        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleSeek}
          className="w-full h-1.5 rounded-full accent-blue-400 cursor-pointer mb-3"
          aria-label="Video progress"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-300 transition-colors min-h-0 min-w-0 w-8 h-8 flex items-center justify-center"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-300 transition-colors min-h-0 min-w-0 w-8 h-8 flex items-center justify-center"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {transcript && (
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className={`min-h-0 min-w-0 w-8 h-8 flex items-center justify-center transition-colors ${showTranscript ? 'text-blue-400' : 'text-white hover:text-blue-300'}`}
                aria-label="Toggle transcript"
                aria-pressed={showTranscript}
              >
                <Captions className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transcript */}
      {showTranscript && transcript && (
        <div className="bg-slate-50 border border-slate-200 rounded-b-xl p-4">
          <h3 className="font-semibold text-slate-700 mb-2 text-sm uppercase tracking-wide">Transcript</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{transcript}</p>
        </div>
      )}
    </div>
  );
}
