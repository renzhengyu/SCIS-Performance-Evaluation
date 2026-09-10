export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0';
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();

export function getFormattedBuildTime(): string {
  try {
    const d = new Date(BUILD_TIME);
    return (
      d.toLocaleString('en-US', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' CST'
    );
  } catch {
    return BUILD_TIME;
  }
}
