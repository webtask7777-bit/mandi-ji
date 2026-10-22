import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { shouldResetRouteScroll, startRouteHashScroll } from '../utils/routeScroll';

export default function RouteScroll() {
  const { pathname, search, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(null);
  useEffect(() => {
    const firstRender = previousPath.current === null;
    const resetTop = shouldResetRouteScroll(previousPath.current, pathname, navigationType, hash);
    previousPath.current = pathname;
    // Leave browser Back/Forward restoration alone. Query-only filters also keep
    // the user's position; a new page opened via PUSH/REPLACE starts at its top.
    if (resetTop) window.scrollTo({ top: 0, behavior: 'auto' });
    if (hash && (firstRender || navigationType !== 'POP')) {
      return startRouteHashScroll({ hash, document, window });
    }
  }, [pathname, search, hash, key, navigationType]);
  return null;
}
