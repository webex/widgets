declare module '@momentum-ui/react-collaboration' {
  import {ComponentType} from 'react';

  // Override the component types to be more permissive with JSX
  export const PopoverNext: ComponentType<Record<string, unknown>>;
  export const TooltipNext: ComponentType<Record<string, unknown>>;
  export const ButtonCircle: ComponentType<Record<string, unknown>>;
  export const SelectNext: ComponentType<Record<string, unknown>>;
  export const ButtonPill: ComponentType<Record<string, unknown>>;
  export const ListNext: ComponentType<Record<string, unknown>>;
  export const ListItemBase: ComponentType<Record<string, unknown>>;
  export const AvatarNext: ComponentType<Record<string, unknown>>;

  // Re-export everything else as-is
  export * from '@momentum-ui/react-collaboration/dist/esm/index';
}
