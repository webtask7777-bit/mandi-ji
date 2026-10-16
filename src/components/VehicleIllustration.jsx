import { DELIVERY_VEHICLE_VISUALS } from '../data/deliveryVehicleVisuals';

/** Model-inspired artwork is keyed to the chosen category, never its editable payload. */
export default function VehicleIllustration({ vehicleId = 'pickup', className = '', priority = false }) {
  const visual = DELIVERY_VEHICLE_VISUALS[vehicleId];
  if (!visual) return null;

  return <img
    className={`sb-vehicle-art ${className}`.trim()}
    src={visual.src}
    alt=""
    aria-hidden="true"
    width="960"
    height="640"
    loading={priority ? 'eager' : 'lazy'}
    decoding="async"
    draggable="false"
  />;
}
