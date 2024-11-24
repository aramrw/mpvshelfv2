import { OsFolder, OsVideo } from "../../models";
import { Accessor, Resource, Setter, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ContextMenu, ContextMenuTrigger } from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import { IconReload } from "@tabler/icons-solidjs";
import IconHeroEye from "../../main-components/icons/icon-hero-eye";
import VideoCardContextMenu from "./video-cm";
import { Platform } from "@tauri-apps/plugin-os";
import { VideoDescription } from "../../main-components/description/video-desc";

function splitFileName(title: string): [string, string] | [string] {
  const lastDotIndex = title.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return [title];
  }

  const name = title.slice(0, lastDotIndex);
  const extension = title.slice(lastDotIndex + 1);
  return [name, extension];
}

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
  mutate: Setter<OsVideo[] | null | undefined>;
  onClick: (event: MouseEvent) => void;
}) => {
  const splitTitle = splitFileName(video.title);
  const FILE_SRC_LWV_COVER_IMG_PATH = convertFileSrc(video?.cover_img_path ?? "");

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000 });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000 });
        a.finished.then(done);
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            class="min-w-52 max-w-[450px] h-56 cursor-pointer relative w-full border-[1.5px]
						border-transparent rounded-none shadow-black/30 shadow-md flex items-center
						justify-center overflow-hidden will-change-transform transition-all group"
            onClick={onClick}
          >
            <div
              class="absolute inset-0 z-0"
              style={{
                "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),url(${FILE_SRC_LWV_COVER_IMG_PATH})`,
                "background-size": "cover",
                "background-repeat": "no-repeat",
                "background-position": "center",
                filter: "blur(6px)",
              }}
            />
            {/* Folder Image */}
            <div class="folder-card-container inset-0">
              <Show when={video.cover_img_path}>
                <img src={video.cover_img_path && convertFileSrc(video.cover_img_path)} class="object-cover w-full h-full relative select-none" />
              </Show>
            </div>

            {/* Hover Overlay for Extended Description */}
            <VideoDescription
              video={() => video}
            />

            {/* Duration Bar */}
            <div
              class="w-full h-3 absolute left-0 top-0 bg-primary/50 
							group-hover:opacity-0 transition-all duration-200"
            />
            {/* Position Bar with blurred background */}
            <div
              class="h-3 absolute left-0 top-0 bg-secondary mix-blend-difference backdrop-blur-md
							group-hover:opacity-0 transition-all duration-200"
              style={{
                width: `${calcTimestampAvg(video.position, video.duration)}%`
              }}
            />

            {/* Video Title at Bottom */}
            <h1
              class="w-fit h-full text-md lg:text-lg xl:text-xl absolute left-0 top-0 bg-primary/80 font-semibold
								border-r-4 border-r-secondary/10 shadow-sm shadow-black/50 text-nowrap
								text-border p-1 pl-1.5 backdrop-blur-sm mix-blend-plus-darker
								group-hover:opacity-90 transition-all duration-300 will-change-auto
								[writing-mode:vertical-rl] [text-orientation:upright] [letter-spacing:-0.1em]"
            >
              {video.title}
            </h1>

            {/* Play Icon */}
            <Show
              when={!video.watched}
              fallback={
                <IconReload
                  class=" h-auto w-[20%] mix-blend-hard-light opacity-80 p-1 text-secondary/80 bg-primary/70 absolute
									left-0 bottom-0 z-10 m-auto inset-0 rounded-md scale-x-[-1] shadow-md shadow-primary/20 group-hover:opacity-0
									transition-opacity duration-300"
                />
              }
            >
              <svg
                class="h-auto w-[20%] p-1 mix-blend-hard-light opacity-80 absolute fill-secondary/80
							left-0 z-10 m-auto inset-0 bg-primary/70 rounded-md
								shadow-md shadow-primary/20 group-hover:opacity-0 transition-opacity
								duration-300"
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
        <VideoCardContextMenu folder={mainParentFolder} video={video} index={index} mutate={mutate} currentPlatform={currentPlatform} />
      </ContextMenu>
    </Transition>
  );
};

export const calcTimestampAvg = (pos: number, dur: number) => {
  return (pos / dur) * 100;
}

export default LibraryVideoCard;


