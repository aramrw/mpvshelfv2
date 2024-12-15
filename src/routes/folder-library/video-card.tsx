import { OsFolder, OsVideo } from "../../models";
import { Accessor, Resource, Setter, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ContextMenu, ContextMenuTrigger } from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import { IconReload } from "@tabler/icons-solidjs";
import VideoCardContextMenu from "./video-cm";
import { Platform } from "@tauri-apps/plugin-os";
import { VideoDescription } from "../../main-components/description/video-desc";

const LibraryVideoCard = ({
  index,
  video,
  mainParentFolder,
  currentPlatform,
  mutate,
  onClick,
}: {
  index: Accessor<number>;
  video: OsVideo;
  mainParentFolder: Resource<OsFolder | null>;
  currentPlatform: Platform;
  mutate: Setter<OsVideo[] | null | undefined>
  onClick: (event: MouseEvent) => void;
}) => {
  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
        a.finished.then(done);
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            class="group relative flex h-52 w-full min-w-52 max-w-[450px] cursor-pointer items-center justify-center overflow-hidden rounded-sm border-[2px] border-primary/80 shadow-md shadow-black/50 transition-all will-change-transform xl:h-60"
            onClick={onClick}
          >
            <div
              class="absolute inset-0 z-0"
              style={{
                "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),
								url(${convertFileSrc(video?.cover_img_path ?? "")})`,
                "background-size": "cover",
                "background-repeat": "no-repeat",
                "background-position": "center",
                filter: "blur(6px)",
              }}
            />
            {/* Folder Image */}
            <div class="folder-card-container inset-0">
              <Show when={video.cover_img_path}>
                <img src=
                  {video.cover_img_path && convertFileSrc(video.cover_img_path)}
                  class="relative h-full w-full select-none object-cover"
                />
              </Show>
            </div>

            {/* Hover Overlay for Extended Description */}
            <VideoDescription
              video={() => video}
            />

            {/* Duration Bar */}
            <div
              class="absolute left-0 top-0 h-3 w-full bg-primary/50 backdrop-blur-sm transition-all duration-200 group-hover:opacity-0"
            />
            {/* Position Bar */}
            <div
              class="absolute left-0 top-0 h-3 bg-secondary mix-blend-exclusion backdrop-blur-md transition-all duration-200 group-hover:opacity-0"
              style={{
                width: `${calcTimestampAvg(video.position, video.duration)}%`
              }}
            />

            {/* Video Title */}
            <h1
              class="absolute left-0 top-0 flex h-full w-fit flex-col items-center justify-start text-nowrap border-r-4 border-r-secondary/10 bg-primary/80 text-xs font-semibold text-border mix-blend-plus-darker shadow-sm shadow-black/50 backdrop-blur-sm transition-all duration-300 will-change-auto group-hover:opacity-90"
            >
              <p class="h-fit w-full border-b-2 border-secondary/10 p-1 text-center text-base font-bold">
                {index()}
              </p>
              <p
                class="[letter-spacing:] h-full w-full p-1 text-start [text-orientation:upright] [writing-mode:vertical-rl]"
              >
                {video.title}
              </p>
            </h1>

            {/* Play Icon */}
            <Show
              when={!video.watched}
              fallback={
                <IconReload
                  class="absolute inset-0 bottom-0 left-0 z-10 m-auto h-auto w-[20%] scale-x-[-1] rounded-md bg-primary/70 p-1 text-secondary/80 opacity-80 mix-blend-hard-light shadow-md shadow-primary/20 transition-opacity duration-300 group-hover:opacity-0"
                />
              }
            >
              <svg
                class="absolute inset-0 left-0 z-10 m-auto h-auto w-[20%] rounded-md bg-primary/70 fill-secondary/80 p-1 opacity-80 mix-blend-hard-light shadow-md shadow-primary/20 transition-opacity duration-300 group-hover:opacity-0"
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
            </Show>
          </div>
        </ContextMenuTrigger>
        <VideoCardContextMenu
          folder={mainParentFolder}
          video={video}
          index={index}
          mutate={mutate}
          currentPlatform={currentPlatform} />
      </ContextMenu>
    </Transition>
  );
};

export const calcTimestampAvg = (pos: number, dur: number) => {
  return (pos / dur) * 100;
}

export default LibraryVideoCard;


