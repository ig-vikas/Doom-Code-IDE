export interface Command {
  id: string;
  label: string;
  category?: string;
  keybinding?: string;
  handler: () => void;
  when?: () => boolean;
}
