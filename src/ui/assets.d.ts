// Bun bundles asset imports and returns the served URL as a string.
declare module "*.svg" {
  const url: string;
  export default url;
}
