export const glassHover = (mode = 'light') => {
  const t = glassTokens[mode];
  return {
    '&:hover': {
      transform: 'translateY(-3px) scale(1.01)',
      boxShadow: `
        0 25px 80px rgba(0,0,0,${mode === 'dark' ? 0.7 : 0.2}),
        0 0 40px ${t.glow}
      `,
      backdropFilter: `blur(24px) saturate(180%)`,
    },
  };
};