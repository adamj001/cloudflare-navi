export const glass = (mode = 'light', level = 1) => {
  const t = glassTokens[mode];
  return {
    position: 'relative',
    overflow: 'hidden',
    background: `${t.bg}`,
    backdropFilter: `blur(${16 + level * 4}px) saturate(160%)`,
    WebkitBackdropFilter: `blur(${16 + level * 4}px) saturate(160%)`,
    border: `1px solid ${t.border}`,
    borderRadius: 24,
    boxShadow: `
      0 ${10 + level * 10}px ${30 + level * 20}px rgba(0,0,0,${mode === 'dark' ? 0.6 : 0.15}),
      inset 0 1px 0 ${mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)'}
    `,
    // ✨ 光晕层（关键升级）
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(circle at top left, ${t.glow}, transparent 60%)`,
      opacity: 0.8,
      pointerEvents: 'none',
    },
    transition: 'all 0.25s ease',
  };
};
