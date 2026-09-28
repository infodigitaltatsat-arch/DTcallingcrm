import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, FastForward } from 'lucide-react';
import { getBackendUrl } from '../services/api';

export default function CallRecordingPlayer({ audioUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);

  const fullUrl = getBackendUrl(audioUrl);

  // Reset player when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.log('Audio playback error:', err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleScrub = (e) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    let nextSpeed = 1;
    if (playbackSpeed === 1) nextSpeed = 1.25;
    else if (playbackSpeed === 1.25) nextSpeed = 1.5;
    else if (playbackSpeed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;

    audioRef.current.playbackRate = nextSpeed;
    setPlaybackSpeed(nextSpeed);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainSecs = Math.floor(secs % 60);
    return `${mins}:${remainSecs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Render a simulated waveform of 40 bars
  const totalWaveformBars = 40;
  const simulatedBars = [
    12, 18, 15, 24, 30, 20, 25, 45, 60, 50, 40, 35, 25, 30, 55, 75, 80, 70, 60, 48,
    30, 24, 38, 52, 64, 70, 58, 44, 32, 28, 35, 42, 50, 48, 36, 24, 18, 20, 15, 10
  ];

  return (
    <div className="bg-dark-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4 max-w-2xl w-full">
      <audio
        ref={audioRef}
        src={fullUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
      />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-royal-600 hover:bg-royal-500 text-white flex items-center justify-center shadow-glow-royal hover:shadow-glow-royal-lg transition-all duration-200 shrink-0"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
      </button>

      {/* Custom Timeline / Waveform UI */}
      <div className="flex-1 w-full">
        {/* Waveform Bar Graphic */}
        <div className="flex items-end justify-between h-8 px-1 mb-2 select-none pointer-events-none">
          {simulatedBars.map((height, i) => {
            const barProgress = (i / totalWaveformBars) * 100;
            const isPlayed = progressPercent >= barProgress;
            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-[3px] rounded-full transition-colors duration-150 ${
                  isPlayed ? 'bg-royal-500' : 'bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Timeline Slider */}
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleScrub}
            className="w-full h-1.5 bg-dark-850 rounded-lg appearance-none cursor-pointer accent-royal-500 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progressPercent}%, #1f2937 ${progressPercent}%, #1f2937 100%)`
            }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed & Volume Side Controls */}
      <div className="flex items-center space-x-3 shrink-0">
        <button
          onClick={cycleSpeed}
          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-dark-800 border border-slate-700 hover:bg-dark-700 hover:border-slate-600 text-xs font-bold text-slate-300 transition-all"
          title="Playback Speed"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>{playbackSpeed}x</span>
        </button>

        {/* Muted indicator/Vol */}
        <div className="flex items-center space-x-1.5">
          <Volume2 className="w-4 h-4 text-slate-500" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="w-14 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-royal-500"
          />
        </div>
      </div>
    </div>
  );
}
