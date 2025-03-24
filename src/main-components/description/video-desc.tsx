import { Component, createMemo, Show, } from "solid-js";
import { OsVideo } from "../../models";
import { bytesToMB, formatPosition, getTitle, splitTitleDots } from "./desc-util";
import IconHeroEye from "../icons/icon-hero-eye";

interface VideoDescProps {
  video: () => OsVideo | null;
  onClick?: () => void;
  className?: string;
}

export const VideoDescription: Component<VideoDescProps> = (props) => {

  // Create a derived signal for the formatted values
  const formatData = createMemo(() => {
    const videoData = props.video();
    const position = formatPosition(videoData?.position, videoData?.duration);
    const [titleText, extension] = splitTitleDots(videoData?.title);
    const size = bytesToMB(videoData?.metadata.size);

    return {
      vid: videoData,
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
      class={
        `absolute inset-0 z-50 h-full w-full 
						max-w-full bg-black/80 opacity-0 
						group-hover:opacity-100 transition-all duration-75 
						flex flex-col items-start justify-between 
						text-white px-4 py-3 transform-gpu
						backdrop-blur-sm select-none will-change-auto 
						cursor-pointer ${props.className}`
      }
      onClick={props.onClick}
    >
      <div class="flex flex-col w-full">
        <div class="flex flex-row">
          <span class="
						  text-base lg:text-lg xl:text-xl
							font-semibold flex flex-row gap-0.5
							text-zinc-100 mix-blend-difference justify-center items-start 
							w-fit z-10 shadow-2xl rounded-none px-0.5">
            <Show when={formatData().vid?.watched}>
              <IconHeroEye class="w-fit h-[20px] lg:h-5 xl:h-6 opacity-70 pb-1" />
            </Show>
            <p class="">
              {formatData().titleText}
            </p>
          </span>
          <p class="text-xs font-medium text-zinc-300 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
            .{formatData().extension}
          </p>
        </div>
        <p class="break-words text-wrap text-[13px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 select-none cursor-pointer">
          {formatData().position[0]} \ {formatData().position[1]}
        </p>
        <p class="break-words text-wrap text-[13px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 select-none cursor-pointer">
          {formatData().size}
        </p>
      </div>
      <div class="absolute bottom-0 right-0 flex flex-col items-end m-2">
        <p class="text-[12px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 leading-tight select-none cursor-pointer">
          {formatData().updateDate}
        </p>
        <p class="text-[13px] font-medium text-zinc-300 w-fit mix-blend-difference z-10 shadow-2xl rounded-none px-0.5 leading-tight select-none cursor-pointer">
          {formatData().updateTime}
        </p>
      </div>
    </div>
  );
};
