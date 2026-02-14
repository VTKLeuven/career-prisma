declare module '@tabler/icons-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export interface TablerIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
    size?: number | string;
    stroke?: number | string;
    color?: string;
    title?: string;
  }

  export type TablerIcon = ComponentType<TablerIconProps>;

  export const IconBuilding: TablerIcon;
  export const IconColumns: TablerIcon;
  export const IconMail: TablerIcon;
  export const IconPlus: TablerIcon;
  export const IconTaxEuro: TablerIcon;
  export const IconBrandInstagram: TablerIcon;
  export const IconCalendarEvent: TablerIcon;
  export const IconFileCv: TablerIcon;
  export const IconSettings: TablerIcon;
  export const IconCheck: TablerIcon;
  export const IconRefresh: TablerIcon;
  export const IconEdit: TablerIcon;
  export const IconEye: TablerIcon;
  export const IconPhone: TablerIcon;
  export const IconUser: TablerIcon;
  export const IconTie: TablerIcon;
  export const IconAlertTriangle: TablerIcon;
  export const IconGlassCocktail: TablerIcon;

  // Allow any other icon to be imported
  const icons: Record<string, TablerIcon>;
  export default icons;
}

