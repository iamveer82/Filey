'use client';

import { useRef, useState, useCallback, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const TemplateCanvas = forwardRef(function TemplateCanvas({
  backgroundImage,
  boxes,
  setBoxes,
  brushStrokes,
  setBrushStrokes,
  activeTool,
  brushColor = '#0B1435',
  brushSize = 3,
  penColor = '#2A63E2',
  penSize = 1,
  selectedBoxId,
  setSelectedBoxId,
}, forwardedRef) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [draggingBox, setDraggingBox] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Expose canvas ref to parent
  useEffect(() => {
    if (forwardedRef) {
      if (typeof forwardedRef === 'function') forwardedRef(canvasRef.current);
      else forwardedRef.current = canvasRef.current;
    }
  }, [forwardedRef]);

  const scale = 1; // Canvas is displayed at natural scale, we handle zoom separately if needed

  const getCanvasPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width * canvas.width,
      y: (clientY - rect.top) / rect.height * canvas.height,
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (activeTool === 'brush' || activeTool === 'pen') {
      setIsDrawing(true);
      const point = getCanvasPoint(e);
      const stroke = {
        id: `stroke_${Date.now()}`,
        tool: activeTool,
        color: activeTool === 'brush' ? brushColor : penColor,
        size: activeTool === 'brush' ? brushSize : penSize,
        points: [point],
      };
      setCurrentStroke(stroke);
    } else if (activeTool === 'select') {
      // Check if clicking on a box
      const point = getCanvasPoint(e);
      const clickedBox = [...boxes].reverse().find(b =>
        point.x >= b.x && point.x <= b.x + b.w &&
        point.y >= b.y && point.y <= b.y + b.h
      );
      if (clickedBox) {
        setSelectedBoxId(clickedBox.id);
        setDraggingBox(clickedBox.id);
        setDragOffset({ x: point.x - clickedBox.x, y: point.y - clickedBox.y });
      } else {
        setSelectedBoxId(null);
      }
    }
  }, [activeTool, brushColor, brushSize, penColor, penSize, boxes, getCanvasPoint, setSelectedBoxId]);

  const handleMouseMove = useCallback((e) => {
    if (isDrawing && currentStroke) {
      const point = getCanvasPoint(e);
      setCurrentStroke(prev => ({ ...prev, points: [...prev.points, point] }));
    } else if (draggingBox) {
      const point = getCanvasPoint(e);
      setBoxes(prev => prev.map(b =>
        b.id === draggingBox
          ? { ...b, x: point.x - dragOffset.x, y: point.y - dragOffset.y }
          : b
      ));
    }
  }, [isDrawing, currentStroke, draggingBox, dragOffset, getCanvasPoint, setBoxes]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentStroke) {
      setBrushStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke(null);
      setIsDrawing(false);
    }
    setDraggingBox(null);
  }, [isDrawing, currentStroke, setBrushStrokes]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Re-draw strokes after image loads
        drawStrokes(ctx);
      };
      img.src = backgroundImage;
    } else {
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawStrokes(ctx);
    }

    function drawStrokes(context) {
      [...brushStrokes, currentStroke].filter(Boolean).forEach(stroke => {
        if (stroke.points.length < 2) return;
        context.beginPath();
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.size;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          context.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        context.stroke();
      });
    }
  }, [backgroundImage, brushStrokes, currentStroke]);

  const removeBox = (id) => {
    setBoxes(prev => prev.filter(b => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const updateBoxText = (id, text) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  return (
    <div ref={containerRef} className="relative select-none" style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        width={794} // A4 at 96 DPI
        height={1123}
        className="w-full h-auto rounded-xl border border-border shadow-lg bg-white cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />

      {/* Text boxes overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {boxes.map(box => (
          <motion.div
            key={box.id}
            className={`absolute pointer-events-auto ${selectedBoxId === box.id ? 'ring-2 ring-brand' : ''}`}
            style={{
              left: `${(box.x / 794) * 100}%`,
              top: `${(box.y / 1123) * 100}%`,
              width: `${(box.w / 794) * 100}%`,
              minHeight: `${(box.h / 1123) * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-full h-full">
              {selectedBoxId === box.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeBox(box.id); }}
                  className="absolute -top-3 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-md hover:bg-dangerStrong transition"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div
                className={`w-full h-full rounded-md px-2 py-1 text-sm ${selectedBoxId === box.id ? 'bg-brand/10 border border-brand/30' : 'bg-transparent border border-transparent hover:border-brand/20'}`}
              >
                {selectedBoxId === box.id ? (
                  <textarea
                    value={box.text || ''}
                    onChange={(e) => updateBoxText(box.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-full resize-none bg-transparent outline-none text-sm text-fg"
                    placeholder={box.presetLabel || 'Type here...'}
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBoxId(box.id);
                    }}
                    className="w-full h-full text-sm text-fg cursor-move"
                  >
                    {box.text || box.presetLabel || '...'}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

export default TemplateCanvas;
