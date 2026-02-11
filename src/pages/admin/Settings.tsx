import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Organization and product settings. Extend as needed (billing, branding, integrations).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            General
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Settings module placeholder. Multi-tenant ready — backend will enforce org isolation for per-organization settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
