declare module '*.mp3' {
  const url: string;
  export default url;
}

declare module '*.json' {
  const data: unknown;
  export default data;
}
