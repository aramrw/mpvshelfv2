import { Component, Show } from "solid-js";
import { OsFolder } from "../../models";

interface FolderDescriptionProps {
  folder: () => OsFolder | null;
  onClick?: () => void;
}

export const FolderDescription: Component<FolderDescriptionProps> = (props) => {
  const folder = props.folder();

  // Check if the folder is an OsFolder by inspecting the last_read_panel or other properties unique to OsFolder
  const getTitle = (title: string | undefined): [string, string] => {
    if (!title) return ["No Title", "No File Type"];
    const parts = title.split("."); // Split by dots
    // Get the file type (extension) — the last part after the last dot
    const ft = parts.length > 1 ? parts.pop()! : "No File Type";
    // Join the remaining parts with spaces
    const nTitle = parts.join(" ");
    return [nTitle, ft];
  };

  const getTitlesFromPath = (title: string | undefined): [string, string] => {
    if (!title) return ["No panel", "No parent"];

    // Split by both '/' and '\' using a regex
    const parts = title.split(/[\\/]/);

    // Get the file type (extension) — the part after the last dot
    const panel = parts.pop();
    const parent = parts.pop();
    if (!panel || !parent) return ["No panel", "No parent"];
    else return [panel, parent];
  };

  const bytesToMB = (bytes: number): string => {
    if (bytes <= 0) return "0 MB";
    const mb = bytes / (1024 * 1024); // Convert bytes to MB
    return `${mb.toFixed(2)}mb`; // Format to 2 decimal places
  };

  const title = getTitle(props.folder()?.title);

  console.log(folder);

  return (
    <div
      class="absolute inset-0 z-50 h-full w-full max-w-full bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-start justify-between text-white px-2.5 py-1.5 backdrop-blur-sm rounded-sm"
      onClick={props.onClick}
    >
      <div class="flex flex-col w-full">
        <div class="text-wrap flex flex-row text-md xl:text-xl font-semibold text-zinc-100 bg-transparent mix-blend-difference z-10 shadow-2xl rounded-none px-0.5">
          {folder?.title}
          {/* <Show when={folder?.}> */}
          {/*   <IconBookFilled class="h-4 transition-all duration-300 fill-secondary/80" /> */}
          {/* </Show> */}
        </div>
        <p class="break-words text-wrap text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference z-10 shadow-2xl rounded-none px-0.5">
          {(folder as OsFolder)?.last_watched_video?.title}
        </p>
        <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference z-10 shadow-2xl rounded-none px-0.5"></p>
      </div>
      <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
        <p class="text-[12px] font-medium text-zinc-300 bg-transparent mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 leading-tight">
          {folder?.update_date}
        </p>
        <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 leading-tight">
          {folder?.update_time}
        </p>
      </div>
    </div>
  );
};
