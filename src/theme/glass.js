import { glassTokens } from './glassTokens';
export const glass = (mode = 'light', intensity = 1) => {
  const t = glassTokens[mode];
  return {
    background: t.bg,
    border: `1px solid ${t.border}`,
    backdropFilter: 'blur(18px) saturate(140%)',
    WebkitBackdropFilter: 'blur(18px) saturate(140%)',
    boxShadow: t.shadow,
    borderRadius: 24,
    opacity: intensity,
  };
};