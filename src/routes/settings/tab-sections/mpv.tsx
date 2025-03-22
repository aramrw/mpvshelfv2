import { Accessor, createEffect, createResource, createSignal, onCleanup, onMount, Setter, Show } from "solid-js";
import IconMpv from "../../../main-components/icons/icon-mpv";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { TabsContent } from "../../../components/ui/tabs";
import { TextField, TextFieldLabel, TextFieldRoot } from "../../../components/ui/textfield";
import { Switch, SwitchControl, SwitchThumb } from "../../../components/ui/switch";
import { IconFolderSearch } from "@tabler/icons-solidjs";
import { Platform, platform } from "@tauri-apps/plugin-os";
import { open as openShell } from "@tauri-apps/plugin-shell";
import { open } from "@tauri-apps/plugin-dialog";
import { MpvSettingsType, SettingsType, UserType } from "../../../models";
import { appDataDir as getAppDataDir, join } from "@tauri-apps/api/path";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import Spinner from "../../../main-components/icons/spinner";
import update_user from "../../../tauri-cmds/user/update-user";

export default function MpvTabSection({
  user,
  opts,
  setOpts,
}: {
  user: UserType;
  opts: Accessor<SettingsType>;
  setOpts: Setter<SettingsType>;
}) {
  const currentPlatform = platform();
  const [appDataDir] = createResource<string>(getAppDataDir);
  const [downloadPercent, setDownloadPercent] = createSignal<number>(0);

  // Maintain local state for MPV settings only.
  const [mpvSettings, setMpvSettings] = createSignal<MpvSettingsType>(user.settings.mpv_settings);

  // Instead of using opts(), use the updater function:
  createEffect(() => {
    setOpts((prev) =>
      prev ? { ...prev, mpv_settings: mpvSettings() } : prev
    );
  });


  // !!!never touch this code!!!
  let unlisten: UnlistenFn | null;
  onMount(async () => {
    unlisten = await listen("progress", (event) => {
      if (typeof event.payload === "number") {
        setDownloadPercent(event.payload as number);
      }
    });
  });
  onCleanup(() => {
    if (unlisten) unlisten();
  });
  // !!!never touch this code!!!

  return (
    <TabsContent value="mpv">
      <Card>
        <CardHeader>
          <CardTitle>
            <IconMpv class="w-4 stroke-[2.4px]" />
            Mpv Settings
          </CardTitle>
          <CardDescription class="flex flex-col gap-2 items-start">
            Tweak Mpv player's config & behavior
            <DownloadMpvAlertDialog
              user={user}
              platform={currentPlatform}
              downloadPercent={downloadPercent}
              setDownloadPercent={setDownloadPercent}
              onDownloaded={(exePath) =>
                setMpvSettings((prev) => ({ ...prev, exe_path: exePath }))
              }
            />
          </CardDescription>
        </CardHeader>
        <CardContent class="w-fit">
          <div class="flex flex-row justify-center sm:justify-start items-center gap-x-4 flex-wrap">
            <FilePickerTextField
              platform={currentPlatform}
              label="Config"
              extensions={["config"]}
              defaultPath={user.settings.mpv_settings.config_path || appDataDir.latest}
              value={mpvSettings().config_path}
              onFileSelected={(path) =>
                setMpvSettings((prev) => ({ ...prev, config_path: path }))
              }
            />
            <Show when={appDataDir.latest}>
              <FilePickerTextField
                platform={currentPlatform}
                label="Plugins"
                extensions={[]}
                defaultPath={user.settings.mpv_settings.plugins_path || appDataDir.latest}
                value={mpvSettings().plugins_path}
                onFileSelected={(path) =>
                  setMpvSettings((prev) => ({ ...prev, plugins_path: path }))
                }
                folderPicker={true}
              />
            </Show>
          </div>
          <FilePickerTextField
            platform={currentPlatform}
            label="Mpv"
            extensions={["exe"]}
            filterName="mpv"
            defaultPath={user.settings.mpv_settings.exe_path || appDataDir.latest}
            value={mpvSettings().exe_path}
            onFileSelected={(path) =>
              setMpvSettings((prev) => ({ ...prev, exe_path: path }))
            }
          />
          <div class="my-3">
            <Switch
              checked={mpvSettings().autoplay}
              onChange={(autoplay) =>
                setMpvSettings((prev) => ({
                  ...prev,
                  autoplay
                }))
              }
              class="w-fit shadow-sm flex flex-row justify-between items-center gap-2 rounded-sm p-2 border"
            >
              <label class="font-medium text-xs">Autoplay</label>
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
            </Switch>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

type FilePickerTextFieldProps = {
  platform: Platform;
  label: string;
  extensions: string[];
  filterName?: string;
  defaultPath?: string;
  value?: string;
  onFileSelected: (path: string) => void;
  folderPicker?: boolean;
};

function FilePickerTextField(props: FilePickerTextFieldProps) {
  return (
    <TextFieldRoot>
      <TextFieldLabel>{props.label}</TextFieldLabel>
      <div class="w-fit flex flex-row justify-center items-center">
        <TextField class="z-10 rounded-r-none" placeholder={props.value} />
        <Button
          variant="outline"
          class="border border-l-0 rounded-none rounded-r-sm p-0"
          onClick={async () => {
            const selected = await open({
              defaultPath: props.defaultPath,
              title: props.label,
              filters:
                props.extensions.length > 0
                  ? [
                    {
                      name: props.filterName || "",
                      extensions: props.extensions,
                    },
                  ]
                  : undefined,
              directory: props.folderPicker || false,
            });
            if (selected) {
              props.onFileSelected(selected);
            }
          }}
        >
          <IconFolderSearch class="p-[3.5px] stroke-[1.9px]" />
        </Button>
      </div>
    </TextFieldRoot>
  );
}

type DownloadMpvAlertDialogProps = {
  user: UserType;
  platform: Platform;
  downloadPercent: Accessor<number>;
  setDownloadPercent: Setter<number>;
  onDownloaded: (exePath: string) => void;
};

function DownloadMpvAlertDialog(props: DownloadMpvAlertDialogProps) {
  const [isOpen, setIsOpen] = createSignal(false);

  const handleDownload = async () => {
    setIsOpen(true);
    const downloadPath = await invoke("download_mpv_binary");
    // Update the local state via callback so the new exe_path is set.
    props.onDownloaded(downloadPath as string);
    await update_user({
      ...props.user,
      settings: {
        ...props.user.settings,
        mpv_settings: {
          ...props.user.settings.mpv_settings,
          exe_path: downloadPath as string,
        },
      },
    });
    setIsOpen(false);
    props.setDownloadPercent(0);
  };

  return (
    <AlertDialog open={isOpen()} onOpenChange={setIsOpen}>
      <AlertDialogTrigger>
        <Button variant="outline" class="text-xs p-0.5 px-1">
          Download Mpv
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent class="bg-popover" data-open={isOpen() ? "true" : "false"}>
        <AlertDialogHeader>
          <AlertDialogTitle class="bg-muted px-1 opacity-90 rounded-sm w-fit">
            <Show when={props.downloadPercent() > 0} fallback="Download Mpv Player?">
              Downloading Mpv Player for ({props.platform}).
            </Show>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Show
              when={!props.downloadPercent() && props.downloadPercent() === 0}
              fallback={
                <>
                  <span>
                    Downloading to your system's appdata folder, please wait...
                  </span>
                  <br />
                  <span class="px-1 text-lg mt-1 rounded-sm bg-muted">
                    {props.downloadPercent()} %
                  </span>
                </>
              }
            >
              mpvshelf can download & manage mpv
              <br />
              <span class="text-primary">How would you like to continue?</span>
            </Show>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Show
          when={props.downloadPercent() === 0}
          fallback={
            <div class="w-full flex justify-end">
              <Spinner />
            </div>
          }
        >
          <AlertDialogFooter>
            <AlertDialogClose
              onClick={() => {
                setIsOpen(false);
                openShell("https://mpv.io/installation/");
              }}
            >
              Manual
            </AlertDialogClose>
            <Button onClick={handleDownload}>Automatic</Button>
          </AlertDialogFooter>
        </Show>
      </AlertDialogContent>
    </AlertDialog>
  );
}

