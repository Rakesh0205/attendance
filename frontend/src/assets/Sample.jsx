import React, { useRef, useState } from "react";
import { RotateCcw, Sparkles, Zap, RefreshCw } from "lucide-react";

const PremiumPullRefresh = ({ onRefresh }) => {
  const initialOffset = 20;
  const [position, setPosition] = useState(initialOffset);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(null);
  const dragging = useRef(false);
  const lineRef = useRef(null);
  const reloaded = useRef(false);

  const updateDrag = (clientY) => {
    const deltaY = clientY - startY.current;
    const newPosition = initialOffset + deltaY;

    if (newPosition >= initialOffset) {
      setPosition(newPosition);

      const lineHeight = lineRef.current?.offsetHeight || 0;
      const threshold = 0.65 * lineHeight;
      const progressPercent = Math.min(
        (newPosition - initialOffset) / (threshold - initialOffset),
        1
      );

      setProgress(progressPercent);

      if (progressPercent >= 1) {
        setStage("ready");
      } else if (progressPercent > 0.3) {
        setStage("pulling");
      } else {
        setStage("idle");
      }

      if (newPosition >= threshold && !reloaded.current) {
        reloaded.current = true;
        handleRefresh();
      }
    }
  };

  const handleMouseDown = (e) => {
    if (isRefreshing) return;
    dragging.current = true;
    startY.current = e.clientY;
    reloaded.current = false;
    setStage("pulling");
  };

  const handleMouseMove = (e) => {
    if (!dragging.current || isRefreshing) return;
    updateDrag(e.clientY);
  };

  const handleMouseUp = () => {
    if (isRefreshing) return;
    dragging.current = false;
    startY.current = null;
    setPosition(initialOffset);
    setProgress(0);
    setStage("idle");
  };

  const handleTouchStart = (e) => {
    if (isRefreshing) return;
    e.preventDefault(); // Prevent browser scroll
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    reloaded.current = false;
    setStage("pulling");
  };

  const handleTouchMove = (e) => {
    if (!dragging.current || isRefreshing) return;
    e.preventDefault(); // Prevent native pull-to-refresh
    updateDrag(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (isRefreshing) return;
    dragging.current = false;
    startY.current = null;
    setPosition(initialOffset);
    setProgress(0);
    setStage("idle");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setStage("refreshing");
    if (onRefresh) {
      await onRefresh();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    setIsRefreshing(false);
    setStage("idle");
    setPosition(initialOffset);
    setProgress(0);
  };

  const getIcon = () => {
    switch (stage) {
      case "idle":
        return <Sparkles className="w-4 h-4 text-gray-400" />;
      case "pulling":
        return <RotateCcw className="w-4 h-4 text-blue-400" />;
      case "ready":
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case "refreshing":
        return <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />;
      default:
        return <Sparkles className="w-4 h-4 text-gray-400" />;
    }
  };

  const getGradientColor = () => {
    switch (stage) {
      case "idle":
        return "from-gray-300 to-gray-500";
      case "pulling":
        return "from-blue-400 to-blue-600";
      case "ready":
        return "from-emerald-400 to-emerald-600";
      case "refreshing":
        return "from-purple-400 to-purple-600";
      default:
        return "from-gray-300 to-gray-500";
    }
  };

  const getHandleGlow = () => {
    switch (stage) {
      case "ready":
        return "shadow-emerald-400/50 shadow-lg";
      case "refreshing":
        return "shadow-purple-400/50 shadow-lg";
      case "pulling":
        return "shadow-blue-400/30 shadow-md";
      default:
        return "";
    }
  };

  return (
    <div
      className="relative flex items-center justify-center h-36 w-12 ml-16"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main drag line area */}
      <div className="relative pointer-events-auto">
        {/* Vertical line with touch-none */}
        <div
          ref={lineRef}
          className="relative w-2 h-32 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 shadow-inner border border-gray-200/50 backdrop-blur-sm touch-none"
        >
          {/* Line gradient */}
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-b ${getGradientColor()} opacity-20 transition-all duration-500`}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${getGradientColor()} transition-all duration-300`}
            style={{
              height: `${progress * 100}%`,
              opacity: progress * 0.4 + 0.1,
            }}
          />

          {/* Draggable Handle */}
          <div
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className={`absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-md border border-white/20 ${getHandleGlow()}`}
            style={{
              top: `${position}px`,
              background: `linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))`,
              transform: `translateX(-50%) scale(${1 + progress * 0.3}) rotate(${progress * 360}deg)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {getIcon()}
            </div>
            <div
              className={`absolute inset-0 rounded-xl bg-white/20 transition-all duration-300 ${
                stage === "ready" ? "animate-pulse" : ""
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPullRefresh;
