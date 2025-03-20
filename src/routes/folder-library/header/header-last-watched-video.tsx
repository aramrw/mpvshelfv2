import { Platform } from "@tauri-apps/plugin-os";
import { ContextMenu, ContextMenuTrigger } from "../../../components/ui/context-menu";
import { calcTimestampAvg } from "../video-card";
import { convertFileSrc } from "@tauri-apps/api/core";
import { VideoDescription } from "../../../main-components/description/video-desc";
import play_video from "../../../tauri-cmds/mpv/play_video";
import GenericContextMenu from "../../../main-components/generic-context-menu";
import { OsFolder, OsVideo, UserType } from "../../../models";
import { Show } from "solid-js";

export default function HeaderLastWatchedVideo({
  user,
  currentPlatform,
  mainParentFolder,
  osVideos,
}: {
  user: () => UserType;
  mainParentFolder: () => OsFolder,
  osVideos: () => OsVideo[],
  currentPlatform: Platform,
}) {

  return (
    <ContextMenu>
      <ContextMenuTrigger
        class="relative w-fit flex items-start gap-2 group cursor-pointer">
        {/* Flex container for the image and SVG */}
        <Show when={mainParentFolder()?.title
          && mainParentFolder()?.last_watched_video && osVideos()}>
          {/* Duration Bar */}
          <div
            class="w-full h-full absolute left-0 top-0 bg-primary/50"
          />
          {/* Position Bar */}
          <div
            class="h-full absolute left-0 top-0 
						bg-secondary mix-blend-difference backdrop-blur-md"
            style={{
              width: (() => {
                const avg = calcTimestampAvg(
                  mainParentFolder()?.last_watched_video?.position!,
                  mainParentFolder()?.last_watched_video?.duration!
                );
                if (avg > 1) {
                  return `${avg}%`;
                }
                return "0%"
              })(),
            }}
          />
          <img
            alt={mainParentFolder()?.title}
            src={convertFileSrc(mainParentFolder()?.last_watched_video?.cover_img_path!)}
            class="select-none object-contain
              h-[220px] md:h-[220px] lg:h-[260px] xl:h-[270px]
              w-auto z-30 p-2
              border-white/10 shadow-md"
          />
          <svg
            class="text-secondary 
							fill-secondary/80 bg-primary/70 rounded-sm 
							transition-all duration-200
							cursor-pointer h-auto w-1/4 p-1 
							mix-blend-hard-light absolute z-50 
							shadow-md shadow-primary/20"
            style={{
              top: "50%",
              left: "50%",
						// Center the Play button within the image
              transform: "translate(-50%, -50%)", 
            }}
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
          <VideoDescription
            video={() => mainParentFolder()?.last_watched_video!}
            onClick={async () => await play_video(
              mainParentFolder()!,
              osVideos()!,
              mainParentFolder()?.last_watched_video!,
              user()!
            )}
          />
        </Show>
      </ContextMenuTrigger>
      <GenericContextMenu
        item={() => mainParentFolder()?.last_watched_video!}
        currentPlatform={currentPlatform}
      />
    </ContextMenu>

  )
}
