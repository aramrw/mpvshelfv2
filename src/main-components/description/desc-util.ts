export const splitTitleDots = (title: string | undefined): [string, string] => {
  if (!title) return ["", ""];

  const parts = title.split(".");
  const fileType = parts.length > 1 ? parts.pop()! : "No File Type";
  const name = parts.join(" ");
  return [name, fileType];
};

export const getTitlesFromPath = (path: string | undefined): [string, string] => {
  if (!path) return ["", ""];

  const parts = path.split(/[\\/]/);
  const panel = parts.pop();
  const parent = parts.pop();
  return [panel ?? "", parent ?? ""];
};

// Check if the video is an OsFolder by inspecting the last_read_panel or other properties unique to OsFolder
export const getTitle = (title: string | undefined): [string, string] => {
  if (!title) return ["No Title", "No File Type"];
  const parts = title.split("."); // Split by dots
  // Get the file type (extension) — the last part after the last dot
  const ft = parts.length > 1 ? parts.pop()! : "No File Type";
  // Join the remaining parts with spaces
  const nTitle = parts.join(" ");
  return [nTitle, ft];
};

export const bytesToMB = (bytes: number | undefined): string => {
  if (!bytes) return "0mb";
  const mb = bytes / (1024 * 1024); // Convert bytes to MB
  return `${mb.toFixed(2)}mb`; // Format to 2 decimal places
};

export const formatPosition = (pos: number | undefined, dur: number | undefined): [string, string] => {
  if (!pos && !dur) return ["00:00", "00:00"];
  const toMinutesAndSeconds = (value: number): number => Math.floor(value / 60) + (value % 60) / 100;
  return [
    toMinutesAndSeconds(pos ? pos : 0).toString().replace(".", ":"),
    toMinutesAndSeconds(dur ? dur : 0).toString().replace(".", ":")];
};


