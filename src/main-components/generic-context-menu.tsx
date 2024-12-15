import { ContextMenuContent, ContextMenuItem } from '../components/ui/context-menu'
import { Show } from 'solid-js'
import show_in_folder from '../tauri-cmds/os_folders/show_in_explorer'
import { IconFolderSearch } from '@tabler/icons-solidjs'
import { Platform } from '@tauri-apps/plugin-os'
import { OsFolder, OsVideo } from '../models'

export default function GenericContextMenu({
  item,
  currentPlatform
}: {
  item: (() => OsFolder) | (() => OsVideo), currentPlatform: Platform
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => show_in_folder(item().path)}>
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
    </ContextMenuContent>
  )
}


