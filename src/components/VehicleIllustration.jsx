/** Small, code-native cargo vehicle artwork. Capacity comes from the calculator,
 * never from these generic illustrations or a manufacturer/model claim. */
export default function VehicleIllustration({ size = 'medium', className = '' }) {
  const small = size === 'small';
  const large = size === 'large';
  return (
    <svg viewBox="0 0 156 82" className={`sb-vehicle-art ${className}`} aria-hidden="true" focusable="false">
      <ellipse cx="77" cy="71" rx="66" ry="5" fill="currentColor" opacity=".07" />
      <path d="M12 65H144" stroke="currentColor" strokeWidth="1.5" opacity=".15" strokeLinecap="round" />
      <path d={large ? 'M15 21H99V58H15Z' : small ? 'M28 33H92V58H28Z' : 'M20 27H94V58H20Z'} fill="#E8B853" stroke="#97742E" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={small ? 'M35 39H84M35 46H84M35 53H84' : 'M27 34H86M27 42H86M27 50H86'} stroke="#B08A3F" strokeWidth="1.3" opacity=".65" strokeLinecap="round" />
      {!small && <path d="M37 28V57M61 28V57M81 28V57" stroke="#B08A3F" opacity=".5" />}
      <path d="M95 33H116L132 47V59H94V33Z" fill="#2B644F" stroke="#174C3C" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M102 37H114L125 47H102V37Z" fill="#D6E6DA" />
      <path d="M118 40V46" stroke="#ADC6B6" strokeWidth="1.2" />
      <path d="M102 52H108" stroke="#B3CDBD" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 58H135V62H15Z" fill="#344C3D" />
      <rect x="130" y="50" width="4" height="5" rx="1" fill="#F5D786" />
      <circle cx="40" cy="63" r="9" fill="#273A30" />
      <circle cx="40" cy="63" r="4" fill="#D2D9CF" />
      {large && <><circle cx="64" cy="63" r="9" fill="#273A30" /><circle cx="64" cy="63" r="4" fill="#D2D9CF" /></>}
      <circle cx="116" cy="63" r="9" fill="#273A30" />
      <circle cx="116" cy="63" r="4" fill="#D2D9CF" />
    </svg>
  );
}
