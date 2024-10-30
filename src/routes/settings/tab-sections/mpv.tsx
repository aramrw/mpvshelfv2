import IconMpv from "../../../main-components/icons/icon-mpv";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  TabsContent,
} from "../../../components/ui/tabs";
import {
  TextField,
  TextFieldLabel,
  TextFieldRoot,
} from "../../../components/ui/textfield";
import { Switch, SwitchControl, SwitchThumb } from "../../../components/ui/switch";
import { IconFolderSearch } from "@tabler/icons-solidjs";
import { Platform, platform } from '@tauri-apps/plugin-os';
import { open } from "@tauri-apps/plugin-dialog";
import { UserType } from "../../../models";
import { appDataDir, join } from '@tauri-apps/api/path';
import { createSignal, onMount } from "solid-js";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction
} from "../../../components/ui/alert-dialog";


export default function MpvTabSection({ user }: { user: UserType | undefined }) {

  const [appData, setAppData] = createSignal<string>();
  const currentPlatform = platform();

  onMount(async () => {
    const appData = await appDataDir();
    setAppData(appData)
  });


  return (
    <TabsContent value="mpv">
      <Card>
        <CardHeader>
          <CardTitle>
            <IconMpv class="w-4 stroke-[2.4px]" />
            Mpv Settings
          </CardTitle>
          <CardDescription class="flex flex-col gap-2 items-start">
            Tweak Mpv player's config, behavior, & more.
						<DownloadMpvAlertDialog />
          </CardDescription>
        </CardHeader>
        <CardContent class="w-fit">
          <div class="flex flex-row justify-center sm:justify-start items-center gap-x-4 flex-wrap">
            <FilePickerTextField
              platform={currentPlatform}
              label={"Mpv"}
              extensions={["exe"]}
              filterName={"mpv"}
              placeholder={user?.settings.mpv_path}
            />
            <FilePickerTextField
              platform={currentPlatform}
              label={"Config"}
              extensions={["config"]}
            />
            <TextFieldRoot class="">
              <TextFieldLabel>Plugins</TextFieldLabel>
              <div class="flex flex-row justify-center items-center">
                <TextField class="z-10 ml-0" placeholder={user?.settings.mpv_path ? user.settings.mpv_path : appData()} />
                <Button variant="outline" class=" border border-l-0 rounded-none rounded-r-sm p-0"
                  onClick={async () => {
                    const file = await open({
                      defaultPath: await join(appData()!, "plugins"),
                      directory: true,
                      title: "Plugins",
                    })
                  }}
                >
                  <IconFolderSearch class="p-[3.5px] stroke-[1.9px]" />
                </Button>
              </div>
            </TextFieldRoot>
          </div>
          <Switch
            checked={user?.settings.autoplay}
            class="w-fit shadow-sm my-3 flex flex-row justify-between items-center gap-2 rounded-sm p-2 border">
            <label class="font-medium text-xs">Autoplay</label>
            <SwitchControl>
              <SwitchThumb />
            </SwitchControl>
          </Switch>
        </CardContent>
      </Card>
    </TabsContent>
  )
}

function DownloadMpvAlertDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
				<Button variant="outline">
					Download Mpv
				</Button>
			</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Download Mpv</AlertDialogTitle>
          <AlertDialogDescription>
						Mpv Shelf can download, install, & manage mpv for you.
						Would you like to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose>Cancel</AlertDialogClose>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  )
}

function FilePickerTextField({
  platform,
  label,
  extensions,
  filterName,
  placeholder,
}: {
  platform: Platform,
  label: string,
  extensions: string[],
  filterName?: string,
  placeholder?: string,
}
) {
  return (
    <TextFieldRoot class="">
      <TextFieldLabel>{label}</TextFieldLabel>
      <div class="flex flex-row justify-center items-center">
        <TextField class="z-10" placeholder={placeholder} />
        <Button variant="outline" class="border border-l-0 rounded-none rounded-r-sm p-0"
          onClick={async () => {
            const file = await open({
              title: label,
              filters: [{
                name: filterName ? filterName : "",
                extensions,
              }]
            })
          }}
        >
          <IconFolderSearch class="p-[3.5px] stroke-[1.9px]" />
        </Button>
      </div>
    </TextFieldRoot>
  )

}
