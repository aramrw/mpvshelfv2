import { OsFolder, OsVideo, UserType } from "../../models";
import { Accessor, Setter, Show } from "solid-js";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "../../components/ui/context-menu";
import { Platform } from '@tauri-apps/plugin-os';
import show_in_folder from "../../tauri-cmds/show_in_folder";
import { delete_os_folders } from "../../tauri-cmds/os_folders";
import { IconBackspace, IconFolderSearch } from "@tabler/icons-solidjs";
import IconHeroEye from "../../main-components/icons/icon-hero-eye";
import { update_os_videos } from "../../tauri-cmds/update_os_videos";
import IconHeroSlashEye from "../../main-components/icons/icon-hero-slasheye";

export default function VideoCardContextMenu({
  folder,
  video,
  mutate,
  currentPlatform
}: {
  folder: OsFolder;
  video: OsVideo;
  mutate: Setter<OsVideo[] | null | undefined>;
  currentPlatform: Platform;
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => show_in_folder(video.path)}>
        <Show when={currentPlatform === "windows"}
          fallback={
            <div class="flex flex-row justify-center items-center gap-1">
              Open in Finder
              <IconFolderSearch class="h-auto w-4" />
            </div>
          }
        >
          <div class="flex flex-row justify-center items-center gap-1">
            Open in Explorer
            <IconFolderSearch class="h-auto w-4" />
          </div>
        </Show>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger inset>Edit</ContextMenuSubTrigger>
        <ContextMenuSubContent class="w-fit mx-2">
          <ContextMenuItem class="flex flex-row items-center justify-between"
            onClick={() => {
              let newVideo = structuredClone(video);
              newVideo.watched = !video.watched;

              update_os_videos([newVideo]).then(() => {
                mutate((videos) => {
                  return videos?.map((vid) => vid.path === newVideo.path ? newVideo : vid) || [];
                });
              });
            }}          
					>
            <Show
              when={!video.watched}
              fallback={
                <>
                  Unwatch
                  <IconHeroSlashEye class="h-auto w-4" />
                </>
              }
            >
              Watch
              <IconHeroEye class="h-auto w-4" />
            </Show>
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  )
}

