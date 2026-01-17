import React, { useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Particle {
    x: number;
    y: number;
    z: number;
    px: number;
    py: number;
    size: number;
    color: string;
    angleX: number;
    angleY: number;
    dist: number;
}

const InteractiveBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        const particleCount = window.innerWidth < 768 ? 300 : 600;

        // Colors inspired by Google Antigravity dots
        const colors = [
            '#4285F4', // blue
            '#EA4335', // red
            '#FBBC05', // yellow
            '#34A853', // green
            '#8E44AD'  // purple
        ];

        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;
        let currentRotationX = 0;
        let currentRotationY = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            const radius = Math.min(canvas.width, canvas.height) * 0.4;

            for (let i = 0; i < particleCount; i++) {
                const theta = Math.random() * 2 * Math.PI;
                const phi = Math.acos(2 * Math.random() - 1);

                particles.push({
                    x: radius * Math.sin(phi) * Math.cos(theta),
                    y: radius * Math.sin(phi) * Math.sin(theta),
                    z: radius * Math.cos(phi),
                    px: 0,
                    py: 0,
                    size: Math.random() * 2 + 0.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    angleX: 0,
                    angleY: 0,
                    dist: radius
                });
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = (e.clientX - canvas.width / 2) / (canvas.width / 2);
            mouseY = (e.clientY - canvas.height / 2) / (canvas.height / 2);
        };

        const rotate = (p: Particle, ax: number, ay: number) => {
            // Rotation around Y axis
            let x = p.x * Math.cos(ay) + p.z * Math.sin(ay);
            let z = p.z * Math.cos(ay) - p.x * Math.sin(ay);

            // Rotation around X axis
            let y = p.y * Math.cos(ax) - z * Math.sin(ax);
            z = z * Math.cos(ax) + p.y * Math.sin(ax);

            p.x = x;
            p.y = y;
            p.z = z;
        };

        const render = (time: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const fov = 600;

            // Smooth mouse rotation with inertia
            targetRotationX = mouseY * 0.05;
            targetRotationY = mouseX * 0.05;

            currentRotationX += (targetRotationX - currentRotationX) * 0.05;
            currentRotationY += (targetRotationY - currentRotationY) * 0.05;

            const pulse = Math.sin(time * 0.001) * 5;

            particles.forEach(p => {
                // Continuous slow rotation + mouse interaction
                rotate(p, currentRotationX + 0.0005, currentRotationY + 0.001);

                const scale = fov / (fov + p.z);
                // Add a slight pulse to the radius effectively
                const x2d = (p.x * (1 + pulse / p.dist)) * scale + centerX;
                const y2d = (p.y * (1 + pulse / p.dist)) * scale + centerY;

                const opacity = (p.z + p.dist) / (2 * p.dist);
                ctx.globalAlpha = Math.max(0.05, opacity * (theme === 'dark' ? 0.5 : 0.8));
                ctx.fillStyle = p.color;

                ctx.beginPath();
                ctx.arc(x2d, y2d, p.size * scale, 0, 2 * Math.PI);
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);

        resize();
        requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ opacity: theme === 'dark' ? 0.4 : 0.6 }}
        />
    );
};

export default InteractiveBackground;
