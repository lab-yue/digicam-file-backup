export declare interface DigicamWindow extends Window {
  helpers: {
    getClickURL(raw: string | null): string | null;
    fillFS(): void;
  };
}

export declare type FS = {
  date: string;
  subject: string;
  time: string;
  deadline: string;
  status: string;
  url: string;
};
