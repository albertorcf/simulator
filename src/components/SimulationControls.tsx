// components/SimulationControls.tsx
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  SkipBack,
  Rewind,
  Play,
  Pause,
  Square,
  FastForward,
  SkipForward,
} from "lucide-react"

interface SimulationControlsProps {
  length: number                    // total de candles
  position: number                  // índice atual
  playing: boolean
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onStepForward?: () => void
  onStepBackward?: () => void
  onFastForward?: () => void
  onRewind?: () => void
  onSeek?: (pos: number) => void
}

export function SimulationControls({
  length, position, playing,
  onPlay, onPause, onStop,
  onStepForward, onStepBackward,
  onFastForward, onRewind,
  onSeek,
}: SimulationControlsProps) {
  return (
    <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
      {/* Linha de botões */}
      <div className="flex items-center justify-center space-x-1">
        <Button variant="outline" size="icon" onClick={onStepBackward} title="Step Backward" aria-label="Step Backward">
          <SkipBack className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={onRewind}>
          <Rewind className="h-5 w-5" />
        </Button>
        {playing ? (
          <Button variant="outline" size="icon" onClick={onPause}>
            <Pause className="h-6 w-6" />
          </Button>
        ) : (
          <Button variant="outline" size="icon" onClick={onPlay}>
            <Play className="h-6 w-6" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={onStop}>
          <Square className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={onFastForward}>
          <FastForward className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={onStepForward} title="Step Forward" aria-label="Step Forward">
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>

      {/* Slider para “seek” candle a candle */}
        <Slider
          min={0}
          max={length - 1}
          value={[position]}
          onValueChange={(val) => { if (onSeek) { onSeek(Array.isArray(val) ? val[0] : val); } } }
        />
      <div className="text-sm text-center">
        Candle {position + 1} de {length}
      </div>
    </div>
  )
}
