export const v = (version?: string | null) => {
  if (!version) {
    return null;
  }
  const result = version.match(/[a-zA-Z0-9]+/g);
  if (!result) return null;
  if (!result[0] || !result[1] || !result[2]) {
    throw new Error(`${version} is not semantic version`);
  }
  return result as [string, string, string, ...string[]] | null;
};
export const getVersion = (version: string) => {
  const _ = v(version);
  if (!_) return null;
  return {
    major: _[0],
    minor: _[1],
    patch: _[2],
    rest: _.slice(3),
  };
};
