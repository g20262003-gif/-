import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  RotateCw,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TetrisControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotate: () => void;
  onStartSoftDrop: () => void;
  onStopSoftDrop: () => void;
  onHardDrop: () => void;
  onHold: () => void;
  isPaused: boolean;
  isGameOver: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
}

export default function TetrisControls({
  onMoveLeft,
  onMoveRight,
  onRotate,
  onStartSoftDrop,
  onStopSoftDrop,
  onHardDrop,
  onHold,
  isPaused,
  isGameOver,
  isMuted,
  onToggleMute,
  onTogglePause,
  onRestart,
}: TetrisControlsProps) {
  // Prevent default scroll behaviors on touch buttons
  const handleTouch = (e: React.TouchEvent, callback: () => void) => {
    e.preventDefault();
    if (!isPaused && !isGameOver) {
      callback();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 max-w-md mx-auto font-mono">
      {/* Top action row: Mute, Pause, Restart with Bold Retro styling */}
      <div className="flex justify-around items-center bg-black px-4 py-3 rounded-none border-2 border-white shadow-md">
        <button
          onClick={onToggleMute}
          className="p-2 border border-transparent hover:border-white active:bg-white active:text-black transition-all"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>

        <button
          onClick={onTogglePause}
          disabled={isGameOver}
          className="flex items-center gap-2 px-4 py-1.5 border-2 border-white bg-[#111115] text-xs font-black uppercase text-white hover:bg-white hover:text-black active:bg-white active:text-black transition-all disabled:opacity-50"
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </>
          )}
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-white bg-black text-xs font-black uppercase text-pink-400 hover:bg-white hover:text-black active:bg-white active:text-black transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESTART</span>
        </button>
      </div>

      {/* Main Touch Controller Layout: Bold Retro 2px solid white borders */}
      <div className="grid grid-cols-12 gap-2 text-white h-44">
        {/* LEFT THUMB ZONE: Movement & Hold (5 cols) */}
        <div className="col-span-5 flex flex-col justify-between h-full">
          {/* Hold Button (Top Left) */}
          <button
            onTouchStart={(e) => handleTouch(e, onHold)}
            onClick={onHold}
            disabled={isPaused || isGameOver}
            className="w-full h-12 bg-[#222] border-2 border-white text-xs font-black text-sky-400 hover:bg-white hover:text-black active:bg-white active:text-black transition-all select-none"
          >
            HOLD
          </button>

          {/* Left / Right horizontal controllers */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <button
              onTouchStart={(e) => handleTouch(e, onMoveLeft)}
              onClick={onMoveLeft}
              disabled={isPaused || isGameOver}
              className="h-24 bg-[#222] border-2 border-white flex items-center justify-center text-white hover:bg-white hover:text-black active:bg-white active:text-black transition-all select-none shadow-md"
            >
              <ArrowLeft className="w-8 h-8 pointer-events-none" />
            </button>
            <button
              onTouchStart={(e) => handleTouch(e, onMoveRight)}
              onClick={onMoveRight}
              disabled={isPaused || isGameOver}
              className="h-24 bg-[#222] border-2 border-white flex items-center justify-center text-white hover:bg-white hover:text-black active:bg-white active:text-black transition-all select-none shadow-md"
            >
              <ArrowRight className="w-8 h-8 pointer-events-none" />
            </button>
          </div>
        </div>

        {/* SPACING / CENTER COLUMN (1 col) */}
        <div className="col-span-1"></div>

        {/* RIGHT THUMB ZONE: Rotation & Drops (6 cols) */}
        <div className="col-span-6 grid grid-cols-2 gap-2 h-full">
          {/* Rotate Button (Standard Rotate) */}
          <button
            onTouchStart={(e) => handleTouch(e, onRotate)}
            onClick={onRotate}
            disabled={isPaused || isGameOver}
            className="col-span-2 h-20 bg-[#222] border-2 border-white flex flex-col items-center justify-center text-purple-400 hover:bg-white hover:text-black active:bg-white active:text-black transition-all select-none shadow-md"
          >
            <RotateCw className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-black tracking-widest">ROTATE</span>
          </button>

          {/* Soft Drop */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (!isPaused && !isGameOver) onStartSoftDrop();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onStopSoftDrop();
            }}
            onMouseDown={() => {
              if (!isPaused && !isGameOver) onStartSoftDrop();
            }}
            onMouseUp={onStopSoftDrop}
            onMouseLeave={onStopSoftDrop}
            disabled={isPaused || isGameOver}
            className="h-20 bg-[#222] border-2 border-white flex flex-col items-center justify-center text-emerald-400 hover:bg-white hover:text-black active:bg-white active:text-black transition-all select-none shadow-md"
          >
            <ArrowDown className="w-6 h-6 mb-1" />
            <span className="text-[9px] font-black tracking-widest">SOFT</span>
          </button>

          {/* Hard Drop */}
          <button
            onTouchStart={(e) => handleTouch(e, onHardDrop)}
            onClick={onHardDrop}
            disabled={isPaused || isGameOver}
            className="h-20 bg-[#222] border-2 border-white flex flex-col items-center justify-center text-pink-400 hover:bg-white hover:text-black active:bg-white active:text-black transition-all select-none shadow-md"
          >
            <Zap className="w-6 h-6 mb-1 text-pink-400 fill-current" />
            <span className="text-[9px] font-black tracking-widest">HARD</span>
          </button>
        </div>
      </div>
    </div>
  );
}
