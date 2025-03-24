import { Accessor, Setter, Show } from "solid-js";
import IconMpv from "../../../main-components/icons/icon-mpv";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { TabsContent } from "../../../components/ui/tabs";
import { Platform, platform } from "@tauri-apps/plugin-os";
import { MpvSettingsType, SettingsType, UserType } from "../../../models";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "../../../components/ui/button";

const exportAllData = (user: UserType) => {
  invoke("export_all_data", { user });
}

const importAllData = (user: UserType) => {
  invoke("import_all_data", { user });
}

export default function DataTabSection({
  user,
  opts,
  setOpts,
}: {
  user: UserType;
  opts: Accessor<SettingsType>;
  setOpts: Setter<SettingsType>;
}) {
  const currentPlatform = platform();

  return (
    <TabsContent value="data">
      <Card>
        <CardHeader>
          <CardTitle>
            <IconMpv class="w-4 stroke-[2.4px]" />
            Mpv Settings
          </CardTitle>
          <CardDescription class="flex flex-col gap-2 items-start">
            Tweak Mpv player's config & behavior
          </CardDescription>
        </CardHeader>
        <CardContent class="w-fit flex flex-col gap-2">
          <div class="flex flex-row justify-center sm:justify-start items-center gap-x-4 flex-wrap">
            <Button variant="outline"
              onClick={() => exportAllData(user)}
            >
              Export All Data
            </Button>
            <p class="font-medium text-primary/50 text-xs w-1/2">
              Exports all folder, video and user data as a .json file to the system download folder
            </p>
          </div>
          <div class="flex flex-row justify-center sm:justify-start items-center gap-x-4 flex-wrap">
            <Button variant="outline"
              onClick={() => importAllData(user)}
            >
							Import All Data
            </Button>
            <p class="font-medium text-primary/50 text-xs w-1/2">
              Imports all folder, video and user data from a .json file at once
            </p>
          </div>
          <div class="my-3">
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

