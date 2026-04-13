import React, { useRef, useState, useEffect } from 'react';

// --- PONG GAME (LOADING STATE) ---
// --- PONG GAME (LOADING STATE) ---
export function PongGame({ message, onScore, onGameOver, width = 350, height = 350, transparent = false }: { message?: string, onScore?: (score: number) => void, onGameOver?: () => void, width?: number, height?: number, transparent?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);

    // Propagate score changes
    useEffect(() => {
        if (onScore) onScore(score);
    }, [score, onScore]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        // physics state in local closure for high-frequency updates
        let ballX = canvas.width / 2;
        let ballY = canvas.height / 2;
        let dx = 2.5;
        let dy = -2.5;
        const ballRadius = 6;
        const paddleHeight = 10;
        const paddleWidth = 50;
        let paddleX = (canvas.width - paddleWidth) / 2;

        function drawBall() {
            if (!ctx) return;
            ctx.beginPath();
            ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#f97316";
            ctx.fill();
            ctx.closePath();
        }

        function drawPaddle() {
            if (!ctx || !canvas) return;
            ctx.beginPath();
            ctx.roundRect(paddleX, canvas.height - paddleHeight - 20, paddleWidth, paddleHeight, 12);
            ctx.fillStyle = transparent ? "rgba(255, 255, 255, 0.9)" : "#1f2937";
            ctx.fill();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 10;
            ctx.closePath();
            ctx.shadowBlur = 0;
        }

        function draw() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Court lines (Center)
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.strokeStyle = transparent ? "rgba(255,255,255,0.3)" : "#e5e7eb";
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.closePath();

            drawBall();
            drawPaddle();

            // Walls
            if (ballX + dx > canvas.width - ballRadius || ballX + dx < ballRadius) {
                dx = -dx;
            }
            if (ballY + dy < ballRadius) {
                dy = -dy;
            }

            // Paddle Interaction (Hits from top only)
            const paddleTop = canvas.height - paddleHeight - 20;
            if (dy > 0 && ballY + ballRadius + dy > paddleTop && ballY + ballRadius <= paddleTop + 10) {
                if (ballX > paddleX && ballX < paddleX + paddleWidth) {
                    dy = -dy;
                    // Increase speed slightly (SLOWER ACCELERATION)
                    dx = (Math.abs(dx) < 15) ? dx + (dx > 0 ? 0.2 : -0.2) : dx;
                    dy = (Math.abs(dy) < 15) ? dy + (dy > 0 ? 0.2 : -0.2) : dy;
                    setScore(s => s + 1);
                }
            }

            // Bottom Bounce (Reset Score but keep moving for continuous trajectory)
            if (ballY + dy > canvas.height - ballRadius) {
                if (dy > 0) { // Only bounce if moving down
                    // Reset Speed to Base (2.5) but keep direction logic
                    dy = -2.5; // Bounce UP with base speed
                    dx = dx > 0 ? 2.5 : -2.5; // Keep horizontal direction but base speed
                    setScore(0); // Penalty: Score reset !
                }
            }

            ballX += dx;
            ballY += dy;

            animationFrameId = requestAnimationFrame(draw);
        }

        const handleMove = (clientX: number) => {
            const rect = canvas.getBoundingClientRect();
            const relativeX = clientX - rect.left;
            const scaleX = canvas.width / rect.width; // Account for CSS scaling
            const canvasX = relativeX * scaleX;

            if (canvasX > 0 && canvasX < canvas.width) {
                paddleX = canvasX - paddleWidth / 2;
            }
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

        // Attach listeners to document for smoother dragging even if cursor leaves canvas
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("touchmove", onTouchMove, { passive: true });

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("touchmove", onTouchMove);
        };
    }, [onGameOver, transparent, width, height]);

    return (
        <div className={`flex flex-col items-center justify-center w-full animate-fade-in ${transparent ? '' : 'bg-white p-4 rounded-2xl border border-gray-100 shadow-sm'}`}>
            {!transparent && (
                <>
                    <h4 className="text-xl font-black italic text-gray-900 mb-1">Sign<span className="text-orange-500">Pong</span></h4>
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-3 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 shadow-sm">
                        Fais un maximum de points pour obtenir des réductions
                    </p>
                </>
            )}
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className={`w-full h-auto object-contain cursor-none touch-none ${transparent ? '' : 'bg-gray-50 rounded-xl shadow-inner border border-gray-200'}`}
                />
                <div className={`absolute top-10 right-0 left-0 text-center text-8xl font-black pointer-events-none select-none ${transparent ? 'text-white/20' : 'text-gray-200 opacity-50'}`}>{score}</div>
            </div>
            {!transparent && <p className="mt-4 text-orange-500 font-bold animate-pulse flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles fa-spin-pulse"></i>
                {message || "L'IA génère votre style..."}
            </p>}
        </div>
    );
};
