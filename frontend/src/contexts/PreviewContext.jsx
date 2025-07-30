import { createContext, useContext } from 'react';

const PreviewContext = createContext();

export const usePreview = () => {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error('usePreview must be used within a PreviewContext');
  }
  return context;
};

export default PreviewContext;
