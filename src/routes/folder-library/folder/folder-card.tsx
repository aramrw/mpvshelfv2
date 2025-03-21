import { OsFolder, } from "../../../models";
import { Accessor, createEffect, Resource, Show } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "../../../components/ui/context-menu";
import { Transition } from "solid-transition-group";
import { FolderDescription } from "../../../main-components/description/folder-desc";
import GenericContextMenu from "../../../main-components/generic-context-menu";
import { Platform } from "@tauri-apps/plugin-os";

const LibraryFolderCard = ({
  index,
  folder,
  mainParentFolder,
  onClick,
  currentPlatform,
}: {
  index: Accessor<number>;
  folder: OsFolder;
  mainParentFolder: Resource<OsFolder | null>;
  currentPlatform: Platform,
  onClick: (event: MouseEvent) => void;
}) => {

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div class="h-56 max-w-[450px] cursor-pointer relative w-full border-[1.5px] bg-foreground 
						border-primary/80 rounded-[2.5px] blur-0 shadow-black/100 shadow-md flex items-center 
						justify-center overflow-hidden will-change-transform transition-all group"
          onClick={onClick}
        >
          <div
            class="absolute inset-0 z-0"
            style={{
              "background-image": `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),
								url(${convertFileSrc(folder?.cover_img_path ?? "")})`,
              "background-size": "cover",
              "background-repeat": "no-repeat",
              "background-position": "center",
              filter: "blur(6px)",
            }}
          />

          {/* Folder Image */}
          <div class="folder-card-container inset-0"
          >
            <Show when={folder.cover_img_path}>
              <img
                src={folder.cover_img_path && convertFileSrc(folder.cover_img_path)}
                class="object-cover w-full h-full relative select-none"
              />
            </Show>
          </div>

          {/* Hover Overlay for Extended Description */}
          <FolderDescription
            folder={() => folder}
          />

          {/* Folder Title */}
          <h1
            class="absolute left-0 top-0 flex h-full 
						w-fit flex-col items-center justify-start 
						text-nowrap border-r-4 border-r-secondary/10 
						bg-primary/80 text-xs font-semibold 
						text-border mix-blend-plus-darker 
						shadow-sm shadow-black/50 
						backdrop-blur-sm transition-all 
						duration-75 will-change-auto 
						group-hover:opacity-90"
          >
            <p class="h-fit w-full border-b-2 border-secondary/10 p-1 text-center text-base font-bold">
              {index()}
            </p>
            <p
              class="[letter-spacing:] h-full w-full p-1 text-start [text-orientation:upright] [writing-mode:vertical-rl]"
            >
              {folder.title}
            </p>
          </h1>
        </div>
      </ContextMenuTrigger>
      <GenericContextMenu
        item={() => folder}
        currentPlatform={currentPlatform}
      />
    </ContextMenu>
  );
};

export default LibraryFolderCard;


