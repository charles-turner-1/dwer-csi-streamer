/// <reference types="vite/client" />

declare const __GIT_COMMIT_SHA__: string;
declare const __BUILD_TIME__: string;

declare module "*.json" {
  const value: Record<string, unknown>;
  export default value;
}
