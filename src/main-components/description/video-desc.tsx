import { Component, createMemo, } from "solid-js";
import { OsVideo } from "../../models";

interface VideoDescProps {
  video: () => OsVideo | null;
  onClick?: () => void;
  className?: string;
}

export const VideoDescription: Component<VideoDescProps> = (props) => {
  // Check if the video is an OsFolder by inspecting the last_read_panel or other properties unique to OsFolder
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

  const formatPosition = (pos: number | undefined, dur: number | undefined): [string, string] => {
    if (!pos && !dur) return ["0", "0"];
    const toMinutesAndSeconds = (value: number): number => Math.floor(value / 60) + (value % 60) / 100;
    return [
      toMinutesAndSeconds(pos ? pos : 0).toString().replace(".", ":"),
      toMinutesAndSeconds(dur ? dur : 0).toString().replace(".", ":")];
  };

  const bytesToMB = (bytes: number | undefined): string => {
    if (!bytes) return "0mb";
    const mb = bytes / (1024 * 1024); // Convert bytes to MB
    return `${mb.toFixed(2)}mb`; // Format to 2 decimal places
  };

  // Create a derived signal for the formatted values
  const formatData = createMemo(() => {
    const videoData = props.video();
    const position = formatPosition(videoData?.position, videoData?.duration);
    const [titleText, extension] = getTitle(videoData?.title);
    const size = bytesToMB(videoData?.metadata.size);

    return {
      position,
      titleText,
      extension,
      size,
      updateDate: videoData?.update_date,
      updateTime: videoData?.update_time
    };
  });


  return (
    <div
      class={`absolute inset-0 z-50 h-full w-full max-w-full bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-start justify-between text-white px-2.5 py-1.5 backdrop-blur-sm select-none cursor-pointer ${props.className}`}
      onClick={props.onClick}
    >
      <div class="flex flex-col w-full">
        <div class="flex flex-row">
          <p class="text-lg lg:text-xl font-semibold text-zinc-100 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5 underline">
            {formatData().titleText}
          </p>
          <p class="text-[13px] font-medium text-zinc-300 bg-transparent mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
            .{formatData().extension}
          </p>
        </div>
        <p class="break-words text-wrap text-[13px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 select-none cursor-default">
          {formatData().position[0]} \ {formatData().position[1]}
        </p>
        <p class="break-words text-wrap text-[13px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 select-none cursor-default">
          {formatData().size}
        </p>
      </div>
      <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
        <p class="text-[12px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 leading-tight select-none cursor-default">
          {formatData().updateDate}
        </p>
        <p class="text-[13px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 leading-tight select-none cursor-default">
          {formatData().updateTime}
        </p>
      </div>
    </div>
  );
};
