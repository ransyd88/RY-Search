"use client";

import { useEffect, useRef } from "react";

type SydneyCapitalCanvasProps = {
  language: "en" | "zh";
};

type Point = {
  x: number;
  y: number;
};

const nodePositions: Point[] = [
  { x: 0.2, y: 0.27 },
  { x: 0.76, y: 0.25 },
  { x: 0.84, y: 0.53 },
  { x: 0.32, y: 0.77 },
];

const labels = {
  en: ["PROPERTY", "PUBLIC MARKETS", "PRIVATE CREDIT", "PRIVATE ENTERPRISE"],
  zh: ["房地产", "公开市场", "私人信贷", "私人企业"],
} as const;

function quadraticPoint(from: Point, control: Point, to: Point, progress: number) {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * from.x + 2 * inverse * progress * control.x + progress * progress * to.x,
    y: inverse * inverse * from.y + 2 * inverse * progress * control.y + progress * progress * to.y,
  };
}

export default function SydneyCapitalCanvas({ language }: SydneyCapitalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastFrame = 0;
    let visible = true;
    const startedAt = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const point = (value: Point) => ({ x: value.x * width, y: value.y * height });
    const centre = { x: 0.56, y: 0.56 };

    const drawSydneyLinework = () => {
      const harborY = height * 0.7;

      context.save();
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "rgba(242, 220, 164, 0.66)";
      context.lineWidth = 1.35;

      context.beginPath();
      context.moveTo(width * 0.05, harborY);
      context.bezierCurveTo(width * 0.2, height * 0.67, width * 0.31, height * 0.75, width * 0.47, harborY);
      context.bezierCurveTo(width * 0.62, height * 0.65, width * 0.76, height * 0.75, width * 0.95, height * 0.69);
      context.stroke();

      context.strokeStyle = "rgba(250, 232, 184, 0.78)";
      context.beginPath();
      context.moveTo(width * 0.08, harborY);
      context.quadraticCurveTo(width * 0.3, height * 0.4, width * 0.53, harborY);
      context.moveTo(width * 0.1, harborY);
      context.lineTo(width * 0.1, height * 0.63);
      context.moveTo(width * 0.51, harborY);
      context.lineTo(width * 0.51, height * 0.63);
      context.stroke();

      for (let index = 1; index < 8; index += 1) {
        const x = width * (0.1 + index * 0.05);
        const normalized = (x / width - 0.305) / 0.205;
        const archY = height * (0.4 + 0.3 * normalized * normalized);
        context.strokeStyle = "rgba(242, 220, 164, 0.38)";
        context.beginPath();
        context.moveTo(x, harborY);
        context.lineTo(x, archY);
        context.stroke();
      }

      context.strokeStyle = "rgba(251, 240, 211, 0.72)";
      context.beginPath();
      context.moveTo(width * 0.63, harborY);
      context.quadraticCurveTo(width * 0.67, height * 0.55, width * 0.71, harborY);
      context.moveTo(width * 0.68, harborY);
      context.quadraticCurveTo(width * 0.74, height * 0.5, width * 0.78, harborY);
      context.moveTo(width * 0.74, harborY);
      context.quadraticCurveTo(width * 0.81, height * 0.57, width * 0.84, harborY);
      context.stroke();
      context.restore();
    };

    const drawNetwork = (elapsed: number) => {
      const source = point(centre);
      const activeLabels = labels[language];
      const reveal = reducedMotion
        ? 1
        : Math.min(1, Math.max(0, (elapsed - startedAt - 220) / 1650));

      nodePositions.forEach((node, index) => {
        const destination = point(node);
        const direction = index % 2 === 0 ? -1 : 1;
        const control = {
          x: (source.x + destination.x) / 2 + width * 0.055 * direction,
          y: (source.y + destination.y) / 2 - height * 0.065,
        };

        context.strokeStyle = "rgba(237, 207, 142, 0.74)";
        context.lineWidth = 1.25;
        context.beginPath();
        context.moveTo(source.x, source.y);
        for (let step = 1; step <= 32; step += 1) {
          const progress = Math.min(reveal, step / 32);
          const current = quadraticPoint(source, control, destination, progress);
          context.lineTo(current.x, current.y);
          if (progress >= reveal) break;
        }
        context.stroke();

        if (reveal < 0.96) return;

        const pulse = reducedMotion ? 0.72 : 0.68 + Math.sin(elapsed * 0.0022 + index) * 0.22;
        context.fillStyle = `rgba(240, 222, 177, ${pulse})`;
        context.beginPath();
        context.arc(destination.x, destination.y, 3.1, 0, Math.PI * 2);
        context.fill();

        context.strokeStyle = "rgba(250, 229, 176, 0.54)";
        context.beginPath();
        context.arc(destination.x, destination.y, 9 + pulse * 4, 0, Math.PI * 2);
        context.stroke();

        context.fillStyle = "rgba(255, 253, 246, 0.98)";
        context.font = language === "zh" ? "600 11px Inter, sans-serif" : "600 10px Inter, sans-serif";
        context.letterSpacing = language === "zh" ? "1px" : "1.5px";
        context.textAlign = node.x > 0.6 ? "right" : "left";
        const labelX = destination.x + (node.x > 0.6 ? -12 : 12);
        context.fillText(activeLabels[index], labelX, destination.y - 9);

        if (!reducedMotion) {
          for (let particle = 0; particle < 3; particle += 1) {
            const rawProgress = (elapsed * 0.000095 + index * 0.19 + particle * 0.33) % 1;
            const progress = particle === 2 ? 1 - rawProgress : rawProgress;
            const current = quadraticPoint(source, control, destination, progress);
            const glow = context.createRadialGradient(current.x, current.y, 0, current.x, current.y, 10);
            glow.addColorStop(0, "rgba(255, 247, 218, 1)");
            glow.addColorStop(0.3, "rgba(235, 204, 137, 0.72)");
            glow.addColorStop(1, "rgba(225, 197, 134, 0)");
            context.fillStyle = glow;
            context.beginPath();
            context.arc(current.x, current.y, 10, 0, Math.PI * 2);
            context.fill();
          }
        }
      });

      const centrePulse = reducedMotion ? 0 : Math.sin(elapsed * 0.002) * 3;
      context.fillStyle = "rgba(255, 253, 246, 1)";
      context.beginPath();
      context.arc(source.x, source.y, 4.2, 0, Math.PI * 2);
      context.fill();
      for (let ring = 0; ring < 3; ring += 1) {
        const phase = reducedMotion ? ring / 3 : (elapsed * 0.00022 + ring / 3) % 1;
        context.strokeStyle = `rgba(239, 209, 145, ${0.72 * (1 - phase)})`;
        context.lineWidth = 1.2;
        context.beginPath();
        context.arc(source.x, source.y, 12 + phase * 34 + centrePulse, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = "rgba(255, 253, 246, 1)";
      context.font = "700 10px Inter, sans-serif";
      context.letterSpacing = "2px";
      context.textAlign = "left";
      context.fillText(language === "zh" ? "悉尼" : "SYDNEY", source.x + 17, source.y + 3);
    };

    const draw = (elapsed: number) => {
      context.clearRect(0, 0, width, height);

      const wash = context.createRadialGradient(width * 0.56, height * 0.56, 0, width * 0.56, height * 0.56, width * 0.62);
      wash.addColorStop(0, "rgba(8, 27, 43, 0.48)");
      wash.addColorStop(0.48, "rgba(8, 27, 43, 0.27)");
      wash.addColorStop(1, "rgba(8, 24, 39, 0.08)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);

      drawSydneyLinework();
      drawNetwork(elapsed);
    };

    const animate = (elapsed: number) => {
      if (visible && elapsed - lastFrame > 32) {
        draw(elapsed);
        lastFrame = elapsed;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });

    resizeObserver.observe(canvas);
    visibilityObserver.observe(canvas);
    resize();
    draw(performance.now());

    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [language]);

  return <canvas ref={canvasRef} className="sydney-capital-canvas" aria-hidden="true" />;
}
