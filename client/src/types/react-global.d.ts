// React global declarations for CI environment

declare module 'react' {
  export default any;
  export * from 'react';
}

declare module 'react/jsx-runtime' {
  export default any;
  export * from 'react/jsx-runtime';
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const Routes: any;
  export const Route: any;
  export const Link: any;
  export const Navigate: any;
  export const Outlet: any;
  export const useNavigate: () => any;
  export const useLocation: () => any;
  export const useParams: () => any;
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 