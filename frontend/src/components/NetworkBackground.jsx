import { useEffect, useRef } from "react";
import "./NetworkBackground.css";

function NetworkBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        let animationFrameId;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        let width = (canvas.width = window.innerWidth * dpr);
        let height = (canvas.height = window.innerHeight * dpr);

        let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = window.innerWidth * dpr;
            height = canvas.height = window.innerHeight * dpr;
        };

        const handleMouseMove = (e) => {
            mouse.targetX = e.clientX * dpr;
            mouse.targetY = e.clientY * dpr;
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);

        // Very light, minimal contour curves
        const lineCount = 7;
        let time = 0;

        const render = () => {
            // Ultra-slow, calming animation speed
            time += 0.0018;

            mouse.x += (mouse.targetX - mouse.x) * 0.02;
            mouse.y += (mouse.targetY - mouse.y) * 0.02;

            ctx.clearRect(0, 0, width, height);

            // Draw ultra-light, gentle topological contours
            for (let i = 0; i < lineCount; i++) {
                const lineProgress = i / lineCount;
                const baseY = height * 0.30 + lineProgress * (height * 0.55);

                ctx.beginPath();
                ctx.moveTo(0, baseY);

                const segments = 36;
                for (let j = 0; j <= segments; j++) {
                    const x = (j / segments) * width;

                    // Subtle, slow terrain wave
                    const wave1 = Math.sin(j * 0.18 + time + i * 0.4) * (14 * dpr);
                    const wave2 = Math.cos(j * 0.10 - time * 0.6 + i * 0.3) * (10 * dpr);

                    // Gentle, subtle mouse easing
                    const distToMouse = Math.hypot(x - mouse.x, baseY - mouse.y);
                    const mouseInfluence = Math.max(0, 1 - distToMouse / (400 * dpr));
                    const mouseLift = Math.sin(mouseInfluence * Math.PI) * (16 * dpr);

                    const y = baseY + wave1 + wave2 - mouseLift;

                    if (j === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                // Very light, elegant monochromatic transparency
                const alpha = (0.02 + lineProgress * 0.025) * (1 - Math.abs(lineProgress - 0.5) * 0.5);
                ctx.strokeStyle = `rgba(15, 23, 42, ${alpha})`;
                ctx.lineWidth = 1 * dpr;
                ctx.stroke();
            }

            // Faint, ambient floating nodes
            const beaconCount = 4;
            for (let b = 0; b < beaconCount; b++) {
                const bx = (0.2 + b * 0.2) * width;
                const by = height * 0.40 + Math.sin(time * 1.2 + b) * (18 * dpr);
                const radius = 2.5 * dpr;

                ctx.beginPath();
                ctx.arc(bx, by, radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(15, 23, 42, 0.12)";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(bx, by, radius * 2.2, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(15, 23, 42, 0.05)";
                ctx.lineWidth = 1 * dpr;
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="goroute-wave-backdrop" aria-hidden="true">
            <div className="aurora-ambient-glow"></div>
            <canvas ref={canvasRef} className="topographic-wave-canvas" />
        </div>
    );
}

export default NetworkBackground;
