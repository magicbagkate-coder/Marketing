import 'dotenv/config';

const DEFAULT_PORT = 3000;

export type EnvConfig = {
  port: number;
};

export const envConfig: EnvConfig = {
  port: Number(process.env.PORT ?? DEFAULT_PORT),
};
