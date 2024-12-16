import { IconFilePlus, IconFolderPlus, IconLoader2, IconLoader3, IconPlus } from "@tabler/icons-solidjs";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { open } from '@tauri-apps/plugin-dialog';
import { OsFolder, UserType } from "../../models";
import { Accessor, createSignal, Show } from "solid-js";
import { Transition } from "solid-transition-group";
import upsert_read_os_dir from "../../tauri-cmds/os_folders/upsert_read_os_dir";

const AddNewSkeleton = ({
  user,
  refetch,
}: {
  user: Accessor<UserType | null>,
  refetch: (info?: unknown) => OsFolder[] | Promise<OsFolder[] | undefined> | null | undefined;
}
) => {

  let [isCreating, setIsCreating] = createSignal(false);

  return (
    <Transition
      appear={true}
      onEnter={(el, done) => {
        const a = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
      onExit={(el, done) => {
        const a = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 600
        });
        a.finished.then(done);
      }}
    >

      <Popover placement="right-start">
        <PopoverTrigger class="h-fit w-fit">
          <div
            class="relative flex w-fit 
						cursor-pointer items-center justify-center 
						transition-opacity duration-75 
						ease-in-out hover:opacity-70">
            <div
              class="h-32 w-24 rounded-sm bg-white 
							shadow-md 
							sm:h-44 sm:w-32 
							md:h-48 md:w-36 
							lg:h-64 lg:w-48 
							xl:h-80 xl:w-56"
            />
            <Show when={!isCreating()}
              fallback={
                <IconLoader2 class="absolute bottom-0 left-0 right-0 top-0 m-auto h-9 w-9 animate-spin stroke-[1.8] text-zinc-300 sm:h-11 sm:w-11 md:h-14 md:w-14 lg:h-20 lg:w-20 xl:h-24 xl:w-24"
                />
              }
            >
              <IconPlus class="absolute bottom-0 left-0 right-0 top-0 m-auto h-9 w-9 stroke-[1.8] text-zinc-300 sm:h-11 sm:w-11 md:h-14 md:w-14 lg:h-20 lg:w-20 xl:h-24 xl:w-24"
              />
            </Show>
          </div>
        </PopoverTrigger>
        <PopoverContent class="flex flex-col items-center justify-center border-none bg-transparent p-0 text-sm font-medium shadow-none">
          <ul class="flex h-full w-fit flex-col gap-1">
            <li class="flex w-fit cursor-pointer flex-row items-center justify-center gap-0.5 rounded-sm bg-white p-1 shadow-md transition-opacity duration-75 ease-in-out hover:opacity-70"
              onClick={async () => {
                setIsCreating(true);
                let dir_path = await open({ directory: true });
                if (dir_path) {
                  await upsert_read_os_dir(dir_path, undefined, user()!, undefined, undefined);
                  refetch();
                }
                setIsCreating(false);
              }}
            >
              <IconFolderPlus class="h-6 w-6 fill-zinc-500 stroke-[2.2] text-primary sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10" />
            </li>
            <li class="flex w-fit cursor-pointer flex-row items-center justify-center gap-0.5 rounded-sm bg-white p-1 shadow-md transition-opacity duration-75 ease-in-out hover:opacity-70"
            >
              <IconFilePlus class="h-6 w-6 fill-zinc-500 stroke-[2.2] text-primary sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10" />
            </li>
          </ul>
        </PopoverContent>
      </Popover>
    </Transition>
  );
};

export default AddNewSkeleton;

