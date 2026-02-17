export type Tab = {
  id: number;
  name: string;
  link: string;
  subTab?: Tab[];
};
