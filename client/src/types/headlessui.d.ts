declare module '@headlessui/react' {
  import { ReactNode } from 'react';

  interface DialogProps {
    open: boolean;
    onClose: (value: boolean) => void;
    className?: string;
    children?: ReactNode;
  }

  export const Dialog: React.FC<DialogProps> & {
    Title: React.FC<{ className?: string; children?: ReactNode }>;
    Description: React.FC<{ className?: string; children?: ReactNode }>;
    Panel: React.FC<{ className?: string; children?: ReactNode }>;
    Overlay: React.FC<{ className?: string; children?: ReactNode }>;
  };

  interface TabProps {
    className?: string | ((props: { selected: boolean }) => string);
    children?: ReactNode;
  }

  interface TabGroupProps {
    selectedIndex?: number;
    onChange?: (index: number) => void;
    className?: string;
    children?: ReactNode;
  }

  export const Tab: React.FC<TabProps> & {
    Group: React.FC<TabGroupProps>;
    List: React.FC<{ className?: string; children?: ReactNode }>;
    Panels: React.FC<{ className?: string; children?: ReactNode }>;
    Panel: React.FC<{ className?: string; children?: ReactNode }>;
  };
}
