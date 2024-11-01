import { OsFolder, OsVideo } from "../../models";
import { Accessor, createEffect, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import { cn } from "../../libs/cn";
import { IconEye, IconReload } from "@tabler/icons-solidjs";
import { createScrollPosition } from "@solid-primitives/scroll";
import IconHeroEye from "../../main-components/icons/icon-hero-eye";

const LibraryVideoCard = ({
  index,
  video,
  mainParentFolder,
  onClick,
}: {
  index: Accessor<number>
  video: OsVideo,
  mainParentFolder: OsFolder
  onClick: (event: MouseEvent) => void,
}) => {

  const splitTitle = video.title.split(".")[0];

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
          <div class="h-auto max-w-[450px] min-h-30 cursor-pointer relative w-full border-[1.5px] 
						border-transparent rounded-none shadow-black/30 shadow-md flex items-center 
						justify-center overflow-hidden will-change-transform transition-all group"
            onClick={onClick}
          >
            {/* Folder Image */}
            <div class="folder-card-container inset-0"
            >
              <Show when={video.cover_img_path}>
                <img
                  src={video.cover_img_path && convertFileSrc(video.cover_img_path)}
                  class="object-cover w-full h-full relative select-none"
                />
              </Show>
            </div>

            {/* Hover Overlay for Extended Description */}
            <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200
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

            {/* Video Title at Bottom */}
            <div class="h-fit absolute left-0 bottom-0 bg-primary/80 
												border-t-2 border-t-secondary/10 shadow-md 
                        text-border text-xs p-1 mix-blend-plus-darker group-hover:opacity-0 transition-opacity duration-300">
              <h1 class="font-medium pointer-events-none select-none">
                <Show when={video.watched}
                  fallback={splitTitle}
                >
                  <div class="flex flex-row gap-1 text-muted/60">
                    {splitTitle}
                    <IconHeroEye class="h-4 text-muted/80" />
                  </div>
                </Show>
              </h1>
            </div>

            {/* Play Icon */}
            <Show when={!video.watched}
              fallback={
                <IconReload
                  class=" h-auto w-[20%] mix-blend-multiply opacity-80 p-1 text-secondary bg-primary/70 absolute
									left-0 bottom-0 z-10 m-auto inset-0 rounded-md scale-x-[-1] shadow-md shadow-primary/20 group-hover:opacity-0 
									transition-opacity duration-300" />
              }>
              <svg
                class="h-auto w-[20%] p-1 mix-blend-multiply opacity-80 absolute fill-secondary 
							left-0 z-10 m-auto inset-0 bg-primary/70 rounded-md 
								shadow-md shadow-primary/20 group-hover:opacity-0 transition-opacity 
								duration-300"
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </Show>
          </div>
        </ContextMenuTrigger>
      </ContextMenu>
    </Transition >
  );
};

export default LibraryVideoCard;

