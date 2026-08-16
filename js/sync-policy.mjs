export function canStartSync({ online, config }) {
  return online === true && Boolean(config && config.url && config.key);
}
