import { createContext, useContext } from 'react';

// Only public, unauthenticated API responses may enter an HTML snapshot.
const ApiSnapshotContext = createContext({ responses: {}, collect: null });
export const ApiSnapshotProvider = ApiSnapshotContext.Provider;
export const useApiSnapshot = () => useContext(ApiSnapshotContext);
