import { IconFilePlus, IconFolderPlus, IconPlus } from "@tabler/icons-solidjs";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import readOsFolderDir from "../../tauri-cmds/read_os_folder_dir";
import { open } from '@tauri-apps/plugin-dialog';
import { UserType } from "src/models";

const AddNewSkeleton = ({ user }: { user: UserType | null }) => {
  return (
    <Popover placement="right-start">
      <PopoverTrigger>
        <div class="w-fit relative flex items-center hover:opacity-50 transition-opacity cursor-pointer duration-100 ease-in-out">
          <div class="h-32 w-24 rounded-sm shadow-md bg-white" />
          <IconPlus class="w-9 h-9 absolute text-zinc-300 fill-red-500 stroke-[1.8] left-[30px] top-15" />
        </div>
      </PopoverTrigger>
      <PopoverContent class="p-0 bg-transparent border-none shadow-none text-sm flex flex-col justify-center items-center font-medium">
        <ul class="w-full h-full flex flex-col gap-1">
          <li class="bg-white p-1 rounded-sm shadow-md flex flex-row justify-center items-center w-fit gap-0.5 hover:opacity-50 transition-opacity duration-100 ease-in-out cursor-pointer"
            on:click={() => {
              console.log("opening finder")
              if (user) {
                open({ directory: true }).then((dir_path) => {
                  if (dir_path) {
                    readOsFolderDir(dir_path, user.id).then((osFolder: unknown) => {
                      console.log(osFolder);
                    });
                  }
                });
              }
            }}
          >
            <IconFolderPlus class="w-4 h-4 text-primary fill-zinc-500 stroke-[2.5]" />
          </li>
          <li class="bg-white p-1 rounded-sm shadow-md flex flex-row justify-center items-center w-fit gap-0.5 hover:opacity-50 transition-opacity duration-100 ease-in-out cursor-pointer"
          >
            <IconFilePlus class="w-4 h-4 text-primary fill-zinc-500 stroke-[2.5]" />
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default AddNewSkeleton;

