import { OsFolder, UserType } from "../../models";
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


export default function FolderCardContextMenuContent({
  folder,
  user,
  setOsFolders,
  currentPlatform
}: {
  folder: OsFolder,
  user: Accessor<UserType | null>,
  setOsFolders: Setter<OsFolder[]>,
  currentPlatform: Platform
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => show_in_folder(folder.path)}>
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
        <ContextMenuSubContent class="w-fit ml-2">
          <ContextMenuItem class="flex flex-row items-center gap-0.5"
            onClick={() => {
              delete_os_folders([folder], user()!.id).then(() => {
                setOsFolders((prev) => {
                  const newOsFolders = [];

                  // Use a raw for loop to build the new array
                  if (prev) {
                    for (let i = 0; i < prev.length; i++) {
                      if (prev[i] !== folder) {
                        newOsFolders.push(prev[i]);
                      }
                    }
                  }

                  return newOsFolders;
                });
              });
            }}
          >
            Remove
            <IconBackspace class="h-auto w-4" />
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  )
}
