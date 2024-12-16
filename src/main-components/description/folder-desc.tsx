import { Component } from "solid-js";
import { OsFolder } from "../../models";
import { splitTitleDots } from "./desc-util";

interface FolderDescriptionProps {
  folder: () => OsFolder | null;
  onClick?: () => void;
}

export const FolderDescription: Component<FolderDescriptionProps> = (props) => {
  const folder = props.folder();

  const [lrp_title, lrp_ext] = splitTitleDots(props.folder()?.last_watched_video?.title);

  return (
    <div
      class="absolute inset-0 z-50 h-full w-full max-w-full bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-75 flex flex-col items-start justify-between text-white px-2.5 py-1.5 backdrop-blur-sm rounded-sm"
      onClick={props.onClick}
    >
      <div 
				class="flex flex-col w-full">
        <div
					class="text-wrap flex flex-row text-md 
					xl:text-xl font-semibold text-zinc-100 
					bg-transparent mix-blend-difference z-10 shadow-2xl rounded-none px-0.5">
          {folder?.title}
        </div>
        <div class="flex flex-row">
          <p class="text-sm font-semibold text-zinc-100 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
            {lrp_title}
          </p>
          <p class="text-xs font-medium text-zinc-300 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
            .{lrp_ext}
          </p>
        </div>
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
