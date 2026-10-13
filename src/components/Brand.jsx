/** The approved SahiBhav wordmark is a path-based asset, not re-typeset text. */
export default function Brand({ compact = false, className = '' }) {
  return (
    <img
      src={compact ? '/brand/app-icon.svg' : '/brand/logo.svg'}
      alt="सही भाव"
      width={compact ? 40 : 132}
      height={compact ? 40 : 41}
      className={`sb-brand ${compact ? 'sb-brand--icon' : ''} ${className}`.trim()}
      decoding="async"
    />
  );
}
