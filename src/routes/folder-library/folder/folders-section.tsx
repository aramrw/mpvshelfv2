import { For, Resource } from "solid-js";
import { OsFolder, UserType } from "../../models";
import LibraryFolderCard from "./folder-card";
import { useNavigate } from "@solidjs/router";
import { Platform } from "@tauri-apps/plugin-os";
import { Transition } from "solid-transition-group";

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
      <Transition
        appear={true}
        onEnter={(el, done) => {
          const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 300
          });
          a.finished.then(done);
        }}
        onExit={(el, done) => {
          const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 300
          });
          a.finished.then(done);
        }}
      >
        <section
          class="md:px-16 lg:px-32 xl:px-56 overflow-hidden w-full h-fit px-2 pb-4 relative 
				border-b-white border-b-2 shadow-lg shadow-primary/10">
          <ul
            class="mx-auto h-fit w-fit grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 
					xl:grid-cols-4 gap-6 justify-center items-center">
            <For each={childFolders()}>
              {(folder, index) => (
                <LibraryFolderCard
                  index={() => index() + 1}
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
      </Transition>
    </>
  )
}

