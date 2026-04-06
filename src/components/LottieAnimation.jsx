import Lottie from 'lottie-react';

/**
 * Reusable Lottie Animation wrapper
 * @param {Object} animationData - Lottie JSON data
 * @param {boolean} loop - Whether to loop (default: true)
 * @param {boolean} autoplay - Whether to autoplay (default: true)
 * @param {string} className - Additional classes
 * @param {Object} style - Inline styles
 */
export default function LottieAnimation({
  animationData,
  loop = true,
  autoplay = true,
  className = '',
  style = {},
  ...props
}) {
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={{ maxWidth: '200px', margin: '0 auto', ...style }}
      {...props}
    />
  );
}
