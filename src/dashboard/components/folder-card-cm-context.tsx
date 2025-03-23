import { OsFolder, UserType } from "../../models";
import { Accessor, Show } from "solid-js";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "../../components/ui/context-menu";
import { Platform } from '@tauri-apps/plugin-os';
import show_in_folder from "../../tauri-cmds/os_folders/show_in_explorer";
import { IconBackspace, IconFolderSearch } from "@tabler/icons-solidjs";
import delete_os_folders from "../../tauri-cmds/os_folders/delete_os_folders";


export default function FolderCardContextMenuContent({
  folder,
  user,
  refetch,
  currentPlatform
}: {
  folder: OsFolder;
  user: Accessor<UserType | null>;
  refetch: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | undefined> | null | undefined;
  currentPlatform: Platform;
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => show_in_folder(folder.path)}>
        <Show when={currentPlatform === "windows"}
          fallback={
            <div class="flex flex-row items-center justify-center gap-1">
              Open in Finder
              <IconFolderSearch class="h-auto w-4" />
            </div>
          }
        >
          <div class="flex flex-row items-center justify-center gap-1">
            Open in Explorer
            <IconFolderSearch class="h-auto w-4" />
          </div>
        </Show>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger inset>Edit</ContextMenuSubTrigger>
        <ContextMenuSubContent class="ml-2 w-fit">
          <ContextMenuItem class="flex flex-row items-center gap-0.5"
            onClick={() => {
              delete_os_folders([folder], user()!).then(() => {
                refetch();
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
