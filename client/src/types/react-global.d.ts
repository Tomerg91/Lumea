// React global declarations for CI environment

import { ComponentType, ReactNode } from 'react';
import { To, Location, Params } from 'react-router-dom';

// These are just placeholders for TypeScript to compile with
// The actual implementations come from the respective libraries
declare module 'react' {
  export default unknown;
  export * from 'react';
}

declare module 'react/jsx-runtime' {
  export default unknown;
  export * from 'react/jsx-runtime';
}

declare module 'react-router-dom' {
  export const BrowserRouter: ComponentType<{ children?: ReactNode }>;
  export const Routes: ComponentType<{ children?: ReactNode }>;
  export const Route: ComponentType<{
    path?: string;
    element?: ReactNode;
    children?: ReactNode;
  }>;
  export const Link: ComponentType<{
    to: To;
    children?: ReactNode;
    className?: string;
  }>;
  export const Navigate: ComponentType<{
    to: To;
    replace?: boolean;
  }>;
  export const Outlet: ComponentType;
  export const useNavigate: () => (to: To, options?: { replace?: boolean }) => void;
  export const useLocation: () => Location;
  export const useParams: <T extends Record<string, string> = Params>() => T;
}

declare namespace JSX {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: {
      [prop: string]: unknown;
      children?: ReactNode;
    };
  }
}
