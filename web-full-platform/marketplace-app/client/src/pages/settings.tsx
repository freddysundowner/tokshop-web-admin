import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MessageCircle, Gift, Users, Eye } from "lucide-react";
import { useSettings } from "@/lib/settings-context";

export default function Settings() {
  const { settings } = useSettings();
  const [directMessages, setDirectMessages] = useState(true);
  const [receiveGifts, setReceiveGifts] = useState(true);
  const [activityStatus, setActivityStatus] = useState(true);
  const [suggestAccount, setSuggestAccount] = useState(true);

  const privacySettings = [
    {
      id: "direct-messages",
      icon: MessageCircle,
      title: "Direct messages",
      description: `Turn this on if you'd like to receive direct messages from ${settings.app_name} users.`,
      value: directMessages,
      onChange: setDirectMessages,
    },
    {
      id: "receive-gifts",
      icon: Gift,
      title: "Receive gifts",
      description: `Turn this on to be discoverable to receive gift purchases from other ${settings.app_name} users.`,
      value: receiveGifts,
      onChange: setReceiveGifts,
    },
    {
      id: "activity-status",
      icon: Users,
      title: "Activity status",
      description: "Turn this on if you'd like to share your activities with your friends.",
      value: activityStatus,
      onChange: setActivityStatus,
    },
    {
      id: "suggest-account",
      icon: Eye,
      title: "Suggest account to others",
      description: `${settings.app_name} will suggest your account to your contacts.`,
      value: suggestAccount,
      onChange: setSuggestAccount,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Preferences</h1>
        </div>

        {/* Privacy Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Privacy</CardTitle>
            <CardDescription className="text-sm">
              Select how you can interact with and be viewed by others.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {privacySettings.map((setting, index) => (
              <div key={setting.id}>
                <div className="flex items-center justify-between py-3 sm:py-4 gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <setting.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm sm:text-base">{setting.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={setting.value}
                    onCheckedChange={setting.onChange}
                    className="flex-shrink-0"
                    data-testid={`switch-${setting.id}`}
                  />
                </div>
                {index < privacySettings.length - 1 && (
                  <div className="border-b border-border" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
