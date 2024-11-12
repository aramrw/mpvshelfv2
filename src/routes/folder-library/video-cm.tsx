import { OsFolder, OsVideo } from "../../models";
import { Accessor, batch, Resource, Setter, Show } from "solid-js";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "../../components/ui/context-menu";
import { Platform } from "@tauri-apps/plugin-os";
import show_in_folder from "../../tauri-cmds/show_in_folder";
import { IconFolderSearch } from "@tabler/icons-solidjs";
import IconHeroEye from "../../main-components/icons/icon-hero-eye";
import { update_os_videos } from "../../tauri-cmds/update_os_videos";
import IconHeroSlashEye from "../../main-components/icons/icon-hero-slasheye";

export default function VideoCardContextMenu({
  folder,
  video,
  index,
  mutate,
  currentPlatform,
}: {
  folder: Resource<OsFolder | null>;
  video: OsVideo;
  index: Accessor<number>;
  mutate: Setter<OsVideo[] | null | undefined>;
  currentPlatform: Platform;
}) {
  const toggleWatchStatus = (targetStatus: boolean, upToIndex: number) => {
    let beUpdatedVideos: OsVideo[] = [];

    mutate((videos) => {
      if (!videos) return []; // Return an empty array if `videos` is null or undefined

      const updatedVideos = [...videos]; // Create a copy of videos

      if (targetStatus) {
        // Watch to here: loop forward from 0 to upToIndex
        for (let i = 0; i <= upToIndex; i++) {
          updatedVideos[i] = { ...updatedVideos[i], watched: true };
        }
      } else {
        // Unwatch to here: loop backward from upToIndex to 0
        // Unwatch everything first
        for (let i = 0; i < updatedVideos.length; i++) {
          updatedVideos[i] = { ...updatedVideos[i], watched: false };
        }

        // Then rewatch up to the clicked index, but **do not rewatch the clicked episode**
        for (let i = 0; i < upToIndex; i++) {
          updatedVideos[i] = { ...updatedVideos[i], watched: true };
        }
      }

      beUpdatedVideos = updatedVideos;
      return updatedVideos; // Return the modified array with updated statuses
    });

    // Optional: Call an update function for the backend if needed
    update_os_videos(beUpdatedVideos.slice(0, upToIndex + 1));
  };

  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => show_in_folder(video.path)}>
        <Show
          when={currentPlatform === "windows"}
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
          <ContextMenuItem
            class="flex flex-row items-center justify-between"
            onClick={() => {
              let newVideo = structuredClone(video);
              newVideo.watched = !video.watched;

              update_os_videos([newVideo]).then(() => {
                batch(() => {
                  mutate((videos) => {
                    if (!videos) return []; // Return an empty array if `videos` is null or undefined
                    const updatedVideos = [...videos];
                    updatedVideos[index()] = newVideo; // Directly update at the current index
                    return updatedVideos;
                  });
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

          <ContextMenuItem class="flex flex-row items-center justify-between" onClick={() => toggleWatchStatus(true, index())}>
            Watch to Here
          </ContextMenuItem>
          <ContextMenuItem class="flex flex-row items-center justify-between" onClick={() => toggleWatchStatus(false, index())}>
            Unwatch to Here
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  );
}
