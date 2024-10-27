import { OsFolder, OsVideo, UserType } from "src/models";
import { Accessor, createEffect, createSignal, Setter, Show } from "solid-js";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { useNavigate } from "@solidjs/router";
import { Transition } from "solid-transition-group";

const LibraryVideoCard = ({
  video,
  mainParentFolder
}: {
  video: OsVideo,
  mainParentFolder: OsFolder
}) => {
  const [coverImgExists, setCoverImgExists] = createSignal(false);
  const navigate = useNavigate();

  createEffect(async () => {
    if (video.cover_img_path) {
      invoke("check_cover_img_exists", { imgPath: video.cover_img_path }).then((exists: unknown) => {
        setCoverImgExists(exists as boolean);
      });
    }
  });

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
          <div class="cursor-pointer relative w-full min-w-32 max-w-72 h-auto border-[1.5px] border-transparent 
						rounded-none shadow-black/30 shadow-md
            flex items-center justify-center overflow-hidden 
            will-change-transform hover:translate-y-[-3px] transition-all group"
          >
            {/* Folder Image */}
            <div class="folder-card-container inset-0">
              <Show when={coverImgExists()}>
                <img
                  src={convertFileSrc(video.cover_img_path!)}
                  class="object-cover w-full h-full relative select-none"
                />
              </Show>
            </div>

            {/* Hover Overlay for Extended Description */}
            <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                        flex items-center justify-center text-white p-4 z-20">
              <p class="text-sm font-medium absolute left-2 top-2 text text-zinc-100 bg-transparent 
												 mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {video.title}
              </p>
              <p class="text-[12px] font-medium absolute left-2 bottom-2 text text-zinc-300 bg-transparent 
												mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {video.update_date}
              </p>
              <p class="text-[13px] font-medium absolute left-2 bottom-6 text text-zinc-300 bg-transparent 
												mix-blend-difference w-fit z-10 shadow-2xl rounded-none px-0.5">
                {video.update_time}
              </p>
            </div>

            {/* Fallback Title if No Cover Image */}
            <Show when={!coverImgExists()}>
              <span class="px-2 text-sm font-medium whitespace-nowrap overflow-hidden relative z-10">
                {video.title}
              </span>
            </Show>

            {/* Video Title at Bottom */}
            <div class="h-fit absolute left-0 bottom-0 bg-primary/80 border-t-2 border-t-secondary/10 shadow-md 
                        shadow-white text-border text-xs p-1 mix-blend-plus-darker">
              <h1 class="font-medium pointer-events-none select-none">{video.title.split(".")[0]}</h1>
            </div>

            {/* Play Icon */}
            <svg
              class="h-auto w-[23%] p-1 mix-blend-multiply absolute fill-white 
							left-0 bottom-5 z-10 m-auto inset-0 bg-primary/50 rounded-full"
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
          </div>
        </ContextMenuTrigger>
      </ContextMenu>
    </Transition>
  );
};

export default LibraryVideoCard;

