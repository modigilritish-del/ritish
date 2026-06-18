"use client";
// components/AnimationOne.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Beautiful night scene: starry sky, pine tree, cozy glowing hut, walking dog
// Pure CSS animations + inline SVG — no external deps beyond Tailwind CDN
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from "react";

const AnimationOne = () => {
  const canvasRef = useRef(null);

  // Generate stars via canvas for performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.75,
      r: Math.random() * 1.8 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    let animId;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;
      stars.forEach((s) => {
        const a = 0.45 + 0.55 * Math.abs(Math.sin(s.phase + t * s.speed * 60));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "linear-gradient(180deg, #020818 0%, #0a1628 28%, #0d2040 55%, #0f2e55 75%, #1a3a5c 88%, #1e3f5a 100%)",
        fontFamily: "'Georgia', serif",
      }}
    >
      {/* ─── CSS Keyframes ─── */}
      <style>{`
        @keyframes dogWalk {
          0%   { transform: translateX(-120px); }
          100% { transform: translateX(calc(100vw + 60px)); }
        }
        @keyframes legSwing {
          0%, 100% { transform: rotate(-18deg); }
          50%       { transform: rotate(18deg); }
        }
        @keyframes tailWag {
          0%, 100% { transform: rotate(-30deg); }
          50%       { transform: rotate(30deg); }
        }
        @keyframes bodyBob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-2.5px); }
        }
        @keyframes hutGlow {
          0%, 100% { opacity: 0.82; filter: blur(0px); }
          50%       { opacity: 1;    filter: blur(0.5px); }
        }
        @keyframes moonPulse {
          0%, 100% { box-shadow: 0 0 28px 10px rgba(255,240,180,0.28), 0 0 60px 20px rgba(255,220,100,0.12); }
          50%       { box-shadow: 0 0 38px 14px rgba(255,240,180,0.38), 0 0 80px 30px rgba(255,220,100,0.18); }
        }
        @keyframes cloudDrift {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-110px); }
        }
        @keyframes fireFlicker {
          0%, 100% { opacity: 0.9; transform: scaleY(1)   scaleX(1); }
          33%       { opacity: 1;   transform: scaleY(1.1) scaleX(0.92); }
          66%       { opacity: 0.8; transform: scaleY(0.95) scaleX(1.06); }
        }
        @keyframes treeSway {
          0%, 100% { transform: rotate(-0.6deg); transform-origin: bottom center; }
          50%       { transform: rotate(0.6deg);  transform-origin: bottom center; }
        }
        @keyframes groundFog {
          0%   { transform: translateX(0) scaleX(1); }
          50%  { transform: translateX(30px) scaleX(1.04); }
          100% { transform: translateX(0) scaleX(1); }
        }
        @keyframes shootingStar {
          0%   { opacity: 0; transform: translate(0,0) scaleX(0); }
          10%  { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { opacity: 0; transform: translate(-260px, 100px) scaleX(1); }
        }
        @keyframes aurora1 {
          0%,100% { opacity: 0.08; transform: scaleY(1)   skewX(-4deg); }
          50%      { opacity: 0.18; transform: scaleY(1.4) skewX(4deg); }
        }
        @keyframes aurora2 {
          0%,100% { opacity: 0.06; transform: scaleY(1.2) skewX(6deg); }
          50%      { opacity: 0.14; transform: scaleY(0.9) skewX(-6deg); }
        }
        @keyframes owlBlink {
          0%,90%,100% { transform: scaleY(1); }
          95%          { transform: scaleY(0.15); }
        }
      `}</style>

      {/* ─── Star Canvas ─── */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      />

      {/* ─── Aurora Borealis ─── */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "6%", left: "10%", width: "55%", height: "22%",
          background: "linear-gradient(180deg, transparent 0%, rgba(0,220,180,0.22) 45%, transparent 100%)",
          borderRadius: "50%", filter: "blur(22px)",
          animation: "aurora1 7s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "4%", left: "38%", width: "48%", height: "18%",
          background: "linear-gradient(180deg, transparent 0%, rgba(120,80,220,0.16) 50%, transparent 100%)",
          borderRadius: "50%", filter: "blur(28px)",
          animation: "aurora2 9s ease-in-out infinite 2s",
        }} />
        <div style={{
          position: "absolute", top: "9%", left: "55%", width: "35%", height: "14%",
          background: "linear-gradient(180deg, transparent 0%, rgba(0,180,255,0.12) 50%, transparent 100%)",
          borderRadius: "50%", filter: "blur(18px)",
          animation: "aurora1 11s ease-in-out infinite 4s",
        }} />
      </div>

      {/* ─── Shooting Star ─── */}
      <div style={{
        position: "absolute", top: "14%", right: "22%", zIndex: 3,
        width: 90, height: 2,
        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 100%)",
        borderRadius: 2,
        transformOrigin: "right center",
        animation: "shootingStar 5.5s ease-in-out infinite 3s",
        pointerEvents: "none",
      }} />

      {/* ─── Moon ─── */}
      <div style={{
        position: "absolute", top: "9%", right: "15%", zIndex: 4,
        width: 68, height: 68, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 38%, #fffde7 0%, #ffe98a 60%, #ffcc44 100%)",
        animation: "moonPulse 4s ease-in-out infinite",
      }}>
        {/* Moon craters */}
        <div style={{ position:"absolute", top:16, left:14, width:10, height:10, borderRadius:"50%", background:"rgba(200,170,50,0.35)" }} />
        <div style={{ position:"absolute", top:34, left:38, width:7, height:7, borderRadius:"50%", background:"rgba(200,170,50,0.28)" }} />
        <div style={{ position:"absolute", top:22, left:42, width:5, height:5, borderRadius:"50%", background:"rgba(200,170,50,0.22)" }} />
      </div>

      {/* ─── Clouds (dark, translucent) ─── */}
      {[
        { top: "18%", left: "8%",  w: 160, h: 40, delay: "0s",   dur: "28s", op: 0.55 },
        { top: "13%", left: "40%", w: 220, h: 52, delay: "8s",   dur: "36s", op: 0.4  },
        { top: "22%", left: "68%", w: 140, h: 36, delay: "4s",   dur: "22s", op: 0.45 },
      ].map((c, i) => (
        <div key={i} style={{
          position: "absolute", top: c.top, left: c.left, zIndex: 5,
          width: c.w, height: c.h, pointerEvents: "none",
          animation: `cloudDrift ${c.dur} linear infinite ${c.delay}`,
          opacity: c.op,
        }}>
          <svg viewBox={`0 0 ${c.w} ${c.h}`} style={{ width: "100%", height: "100%" }}>
            <ellipse cx={c.w*0.5} cy={c.h*0.72} rx={c.w*0.48} ry={c.h*0.38} fill="rgba(20,35,70,0.85)" />
            <ellipse cx={c.w*0.32} cy={c.h*0.55} rx={c.w*0.28} ry={c.h*0.42} fill="rgba(20,35,70,0.8)" />
            <ellipse cx={c.w*0.68} cy={c.h*0.52} rx={c.w*0.22} ry={c.h*0.38} fill="rgba(20,35,70,0.75)" />
          </svg>
        </div>
      ))}

      {/* ─── Hills / Ground ─── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 6, pointerEvents: "none" }}>
        <svg viewBox="0 0 1440 340" preserveAspectRatio="none" style={{ width: "100%", height: 340, display: "block" }}>
          {/* Far hill */}
          <ellipse cx={900} cy={280} rx={700} ry={160} fill="#0d2236" />
          {/* Mid hill */}
          <ellipse cx={200} cy={290} rx={480} ry={130} fill="#0a1e30" />
          {/* Main ground */}
          <rect x={0} y={240} width={1440} height={100} fill="#081828" />
          {/* Snow on ground */}
          <path d="M0,240 Q360,225 720,238 Q1080,248 1440,232 L1440,260 L0,260 Z" fill="#e8f0f8" opacity="0.13" />
          {/* Ground base */}
          <rect x={0} y={258} width={1440} height={82} fill="#07141f" />
        </svg>
      </div>

      {/* ─── Ground Fog ─── */}
      <div style={{
        position: "absolute", bottom: "11%", left: 0, right: 0, zIndex: 7,
        height: 60, pointerEvents: "none",
        background: "linear-gradient(180deg, transparent 0%, rgba(180,210,240,0.07) 60%, rgba(180,210,240,0.13) 100%)",
        filter: "blur(8px)",
        animation: "groundFog 12s ease-in-out infinite",
      }} />

      {/* ─── BIG Pine Tree ─── */}
      <div style={{
        position: "absolute", bottom: "16.5%", left: "12%", zIndex: 10,
        animation: "treeSway 6s ease-in-out infinite",
        transformOrigin: "bottom center",
      }}>
        <svg viewBox="0 0 160 320" width={160} height={320}>
          {/* Snow on layers */}
          <polygon points="80,8 125,105 35,105"  fill="#1a4a22" />
          <polygon points="80,8 118,100 42,100"  fill="#d8eef0" opacity="0.18" />
          <polygon points="80,55 132,168 28,168" fill="#1e5a28" />
          <polygon points="80,55 124,162 36,162" fill="#d8eef0" opacity="0.14" />
          <polygon points="80,115 142,240 18,240" fill="#225e2a" />
          <polygon points="80,115 132,234 28,234" fill="#d8eef0" opacity="0.12" />
          <polygon points="80,180 148,310 12,310" fill="#1f5a26" />
          {/* Trunk */}
          <rect x={70} y={308} width={20} height={12} rx={3} fill="#3d2408" />
          {/* Snow tips */}
          <polygon points="80,8 92,40 68,40"   fill="#ddeef2" opacity="0.55" />
          <polygon points="80,55 96,85 64,85"  fill="#ddeef2" opacity="0.35" />
          <polygon points="80,115 100,150 60,150" fill="#ddeef2" opacity="0.22" />
        </svg>
      </div>

      {/* ─── Small Pine Trees (background) ─── */}
      {[
        { left: "3%",  bot: "14%", scale: 0.55, delay: "1s" },
        { left: "22%", bot: "15%", scale: 0.42, delay: "2.5s" },
        { left: "72%", bot: "15%", scale: 0.5,  delay: "0.8s" },
        { left: "82%", bot: "14%", scale: 0.65, delay: "3s" },
        { left: "92%", bot: "15%", scale: 0.38, delay: "1.5s" },
      ].map((t, i) => (
        <div key={i} style={{
          position: "absolute", bottom: t.bot, left: t.left, zIndex: 9,
          transform: `scale(${t.scale})`, transformOrigin: "bottom center",
          animation: `treeSway 7s ease-in-out infinite ${t.delay}`,
          pointerEvents: "none",
        }}>
          <svg viewBox="0 0 80 160" width={80} height={160}>
            <polygon points="40,4 65,55 15,55" fill="#183e1d" />
            <polygon points="40,30 70,95 10,95" fill="#1e4d22" />
            <polygon points="40,65 75,148 5,148" fill="#1c4820" />
            <rect x={35} y={147} width={10} height={13} rx={2} fill="#3d2408" />
            <polygon points="40,4 48,22 32,22" fill="#d8eef2" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* ─── HUT ─── */}
      <div style={{
        position: "absolute", bottom: "18.5%", left: "50%", transform: "translateX(-50%)",
        zIndex: 12, width: 220,
      }}>
        <svg viewBox="0 0 220 200" width={220} height={200}>
          {/* Chimney */}
          <rect x={140} y={20} width={22} height={55} rx={3} fill="#4a2e12" />
          <rect x={136} y={18} width={30} height={10} rx={3} fill="#5a3818" />
          {/* Smoke puffs */}
          <circle cx={151} cy={10} r={7} fill="rgba(180,180,200,0.28)" />
          <circle cx={157} cy={2}  r={5} fill="rgba(180,180,200,0.18)" />

          {/* Roof snow */}
          <polygon points="10,95 110,22 210,95" fill="#ddeef5" />
          <polygon points="10,95 110,22 210,95" fill="rgba(210,235,255,0.5)" />
          {/* Roof wood */}
          <polygon points="18,95 110,30 202,95" fill="#5a3415" />
          {/* Roof shingles lines */}
          {[50,62,74,86].map(y => (
            <line key={y} x1={110-(y-30)*1.7} y1={y} x2={110+(y-30)*1.7} y2={y} stroke="#6d4020" strokeWidth="1.5" opacity="0.5" />
          ))}
          {/* Snow on roof edge */}
          <path d="M10,95 Q60,88 110,92 Q160,88 210,95 L210,100 Q160,96 110,100 Q60,96 10,100 Z" fill="#e8f4fa" />

          {/* Walls */}
          <rect x={25} y={93} width={170} height={107} rx={3} fill="#6b3e1a" />
          {/* Wall wood grain */}
          {[110,125,140,155,170,185].map(y => (
            <line key={y} x1={25} y1={y} x2={195} y2={y} stroke="rgba(0,0,0,0.08)" strokeWidth="1.2" />
          ))}

          {/* Door */}
          <rect x={88} y={135} width={44} height={65} rx={5} fill="#3d1f08" />
          <rect x={92} y={139} width={36} height={57} rx={3} fill="#4a2810" />
          {/* Door handle */}
          <circle cx={124} cy={170} r={3} fill="#c8922a" />
          {/* Door window glow */}
          <rect x={95} y={143} width={30} height={20} rx={2} fill="rgba(255,200,80,0.22)" />

          {/* Left window */}
          <rect x={36} y={110} width={42} height={34} rx={4} fill="#2a1608" />
          <rect x={39} y={113} width={36} height={28} rx={2} fill="rgba(255,190,60,0.85)" />
          <line x1={57} y1={113} x2={57} y2={141} stroke="#3d1e08" strokeWidth="2" />
          <line x1={39} y1={127} x2={75} y2={127} stroke="#3d1e08" strokeWidth="2" />
          {/* Window warm glow overflow */}
          <ellipse cx={57} cy={127} rx={28} ry={20} fill="rgba(255,160,40,0.08)" />

          {/* Right window */}
          <rect x={142} y={110} width={42} height={34} rx={4} fill="#2a1608" />
          <rect x={145} y={113} width={36} height={28} rx={2} fill="rgba(255,190,60,0.85)" />
          <line x1={163} y1={113} x2={163} y2={141} stroke="#3d1e08" strokeWidth="2" />
          <line x1={145} y1={127} x2={181} y2={127} stroke="#3d1e08" strokeWidth="2" />
          <ellipse cx={163} cy={127} rx={28} ry={20} fill="rgba(255,160,40,0.08)" />

          {/* Outdoor lantern */}
          <rect x={107} y={118} width={6} height={16} rx={1} fill="#c8922a" />
          <rect x={103} y={134} width={14} height={18} rx={3} fill="rgba(255,200,80,0.92)" />
          <rect x={104} y={135} width={12} height={16} rx={2} fill="rgba(255,230,120,0.7)" />
        </svg>

        {/* Hut warm light glow on ground */}
        <div style={{
          position: "absolute", bottom: -14, left: "50%", transform: "translateX(-50%)",
          width: 180, height: 28,
          background: "radial-gradient(ellipse, rgba(255,160,40,0.22) 0%, transparent 70%)",
          filter: "blur(6px)",
          animation: "hutGlow 3s ease-in-out infinite",
        }} />
      </div>

      {/* ─── Window glow on ground ─── */}
      <div style={{
        position: "absolute", bottom: "19%", left: "calc(50% - 90px)", zIndex: 11,
        width: 80, height: 18,
        background: "radial-gradient(ellipse, rgba(255,160,40,0.28) 0%, transparent 75%)",
        filter: "blur(8px)",
        animation: "hutGlow 2.5s ease-in-out infinite 0.5s",
      }} />
      <div style={{
        position: "absolute", bottom: "19%", left: "calc(50% + 10px)", zIndex: 11,
        width: 80, height: 18,
        background: "radial-gradient(ellipse, rgba(255,160,40,0.28) 0%, transparent 75%)",
        filter: "blur(8px)",
        animation: "hutGlow 2.5s ease-in-out infinite 1s",
      }} />

      {/* ─── Fireplace smoke ─── */}
      <div style={{
        position: "absolute", zIndex: 13, pointerEvents: "none",
        bottom: "calc(18.5% + 175px)", left: "calc(50% + 30px)",
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            position: "absolute",
            left: i * 6, top: -i * 18,
            width: 14 + i * 4, height: 14 + i * 4,
            borderRadius: "50%",
            background: "rgba(160,160,180,0.18)",
            filter: "blur(3px)",
            animation: `fireFlicker ${2 + i * 0.4}s ease-in-out infinite ${i * 0.5}s`,
          }} />
        ))}
      </div>

      {/* ─── Owl on tree ─── */}
      <div style={{
        position: "absolute", bottom: "calc(16.5% + 180px)", left: "calc(12% + 60px)",
        zIndex: 11, width: 34,
      }}>
        <svg viewBox="0 0 34 40" width={34} height={40}>
          {/* Body */}
          <ellipse cx={17} cy={26} rx={11} ry={14} fill="#4a3520" />
          {/* Head */}
          <ellipse cx={17} cy={13} rx={10} ry={10} fill="#5a4228" />
          {/* Ear tufts */}
          <polygon points="10,6 8,0 14,5"  fill="#5a4228" />
          <polygon points="24,6 26,0 20,5" fill="#5a4228" />
          {/* Eyes */}
          <circle cx={13} cy={13} r={4.5} fill="#ffe082" style={{ animation: "owlBlink 5s ease-in-out infinite" }} />
          <circle cx={21} cy={13} r={4.5} fill="#ffe082" style={{ animation: "owlBlink 5s ease-in-out infinite" }} />
          <circle cx={13} cy={13} r={2.5} fill="#1a1008" />
          <circle cx={21} cy={13} r={2.5} fill="#1a1008" />
          <circle cx={13.8} cy={12} r={1} fill="white" />
          <circle cx={21.8} cy={12} r={1} fill="white" />
          {/* Beak */}
          <polygon points="17,16 14,19 20,19" fill="#c8922a" />
          {/* Wing pattern */}
          <ellipse cx={17} cy={28} rx={8} ry={9} fill="none" stroke="#6b5030" strokeWidth="1.2" opacity="0.5" />
        </svg>
      </div>

      {/* ─── Walking DOG ─── */}
      <div style={{
        position: "absolute",
        bottom: "calc(14.5%)", zIndex: 14,
        animation: "dogWalk 14s linear infinite",
      }}>
        {/* Dog body */}
        <div style={{
          position: "relative", width: 110, height: 70,
          animation: "bodyBob 0.5s ease-in-out infinite",
        }}>
          <svg viewBox="0 0 110 70" width={110} height={70}>
            {/* Tail */}
            <g style={{ transformOrigin: "8px 24px", animation: "tailWag 0.4s ease-in-out infinite" }}>
              <path d="M8,24 Q-8,8 2,0" stroke="#c8922a" strokeWidth="6" strokeLinecap="round" fill="none" />
            </g>

            {/* Body */}
            <ellipse cx={60} cy={30} rx={36} ry={20} fill="#c8922a" />
            {/* Belly lighter */}
            <ellipse cx={60} cy={36} rx={24} ry={12} fill="#e8b060" />

            {/* Neck */}
            <ellipse cx={92} cy={22} rx={14} ry={12} fill="#c8922a" />

            {/* Head */}
            <ellipse cx={96} cy={14} rx={14} ry={12} fill="#c8922a" />
            {/* Snout */}
            <ellipse cx={106} cy={18} rx={8} ry={6} fill="#b87830" />
            {/* Nose */}
            <ellipse cx={112} cy={16} rx={3.5} ry={2.8} fill="#2a1008" />
            {/* Eye */}
            <circle cx={100} cy={11} r={3.5} fill="#1a0e06" />
            <circle cx={101} cy={10} r={1.2} fill="white" />
            {/* Ear */}
            <ellipse cx={90} cy={8} rx={7} ry={10} fill="#a8601a" transform="rotate(-15,90,8)" />

            {/* Collar */}
            <rect x={86} y={22} width={20} height={5} rx={2.5} fill="#e03030" />
            <circle cx={96} cy={27} r={2} fill="#ffd700" />

            {/* Front legs */}
            <g style={{ transformOrigin: "76px 46px", animation: "legSwing 0.4s ease-in-out infinite" }}>
              <rect x={72} y={46} width={9} height={22} rx={4} fill="#b87030" />
              <ellipse cx={76} cy={68} rx={6} ry={3} fill="#a06020" />
            </g>
            <g style={{ transformOrigin: "88px 46px", animation: "legSwing 0.4s ease-in-out infinite 0.2s" }}>
              <rect x={84} y={46} width={9} height={22} rx={4} fill="#c8922a" />
              <ellipse cx={88} cy={68} rx={6} ry={3} fill="#a06020" />
            </g>

            {/* Back legs */}
            <g style={{ transformOrigin: "40px 46px", animation: "legSwing 0.4s ease-in-out infinite 0.2s" }}>
              <rect x={36} y={46} width={9} height={22} rx={4} fill="#b87030" />
              <ellipse cx={40} cy={68} rx={6} ry={3} fill="#a06020" />
            </g>
            <g style={{ transformOrigin: "52px 46px", animation: "legSwing 0.4s ease-in-out infinite" }}>
              <rect x={48} y={46} width={9} height={22} rx={4} fill="#c8922a" />
              <ellipse cx={52} cy={68} rx={6} ry={3} fill="#a06020" />
            </g>
          </svg>
        </div>
      </div>

      {/* ─── Footprints in snow ─── */}
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{
          position: "absolute", bottom: "13.2%",
          left: `${8 + i * 6}%`, zIndex: 7,
          width: 10, height: 6,
          borderRadius: "50%",
          background: "rgba(180,210,240,0.25)",
          transform: i % 2 === 0 ? "rotate(-10deg)" : "rotate(10deg) translateY(4px)",
          pointerEvents: "none",
        }} />
      ))}

      {/* ─── Title overlay (subtle, bottom-right) ─── */}
      <div style={{
        position: "absolute", bottom: 22, right: 28, zIndex: 20,
        color: "rgba(200,220,255,0.35)",
        fontSize: 11, letterSpacing: "0.18em",
        fontFamily: "Georgia, serif",
        textTransform: "uppercase",
        pointerEvents: "none",
        userSelect: "none",
      }}>
        A Winter Night
      </div>
    </div>
  );
};

export default AnimationOne;