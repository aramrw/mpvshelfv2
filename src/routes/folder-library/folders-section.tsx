import { For, Resource } from "solid-js";
import { OsFolder, UserType } from "../../models";
import LibraryFolderCard from "./folder-card";
import { useNavigate } from "@solidjs/router";
import { Platform } from "@tauri-apps/plugin-os";

export default function LibraryFoldersSection({
  user,
  mainParentFolder,
  childFolders,
  currentPlatform,
}: {
  user: Resource<UserType | null>;
  mainParentFolder: Resource<OsFolder | null>;
  childFolders: Resource<OsFolder[] | null>;
  currentPlatform: Platform,
}
) {
  const navigate = useNavigate();

  return (
    <>
      <section
        class="md:px-4 overflow-hidden w-full h-fit px-2 pb-4 relative 
				border-b-white border-b-2 shadow-lg shadow-primary/10">
        <ul
          class="mx-auto h-fit w-fit grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 
					xl:grid-cols-4 gap-6 justify-center items-center">
          <For each={childFolders()}>
            {(folder, index) => (
              <LibraryFolderCard
                index={index}
                folder={folder}
                mainParentFolder={mainParentFolder}
                currentPlatform={currentPlatform}
                onClick={() => {
                  navigate(`/library/${encodeURIComponent(folder.path)}`);
                }}
              />
            )}
          </For>
        </ul>
      </section>
    </>
  )
}

