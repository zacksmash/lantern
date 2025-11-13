declare global {
  var env: (key: string, defaultValue?: string) => string | undefined;
}

globalThis.env = function (key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

export {};
