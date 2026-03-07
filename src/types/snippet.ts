export interface Snippet {
  prefix: string;
  body: string;
  description: string;
  name?: string;
  category?: string;
  scope?: string;
  isTemplate?: boolean;
}
