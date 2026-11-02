import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, Loading, Show } from "solid-js";
import { useAuth } from "./features/account/account-context";
import { useProviderDetection } from "./features/custom-providers/provider-detection-context";
import { createLanguageStep } from "./features/onboarding/language-step";
import { useSetup } from "./features/onboarding/onboarding-context";
import { SetupReadError } from "./features/onboarding/SetupReadError";
import { useSetupProviderProps } from "./features/onboarding/setup-provider-props";
import { useServerScope } from "./features/servers/server-scope";
import { useServerSelection } from "./features/servers/server-selection";
import { useSettings } from "./features/settings/settings-context";
import { StartupSplash } from "./features/startup/StartupSplash";
import { WhatsNewOverlay } from "./features/updates/WhatsNewOverlay";
import { QuitShortcutHint } from "./features/window/QuitShortcutHint";
import { FirstRunFlow, InitialSetup, LanguageStep } from "./lazy-views";
import { usePlatform } from "./platform";
import { WorkspaceShell } from "./WorkspaceShell";

function LoadingScreen() {
  const { t } = useText();
  return <div class="initial-setup-screen" role="status" aria-label={t("app.loading")} />;
}

/**
 * OpenBot Local: the workspace, first run and setup open without an account. The sign-in screen is
 * never shown at start; a signed-in account (from an earlier session) is still used when present.
 */
export function AppAccessGate() {
  const platform = usePlatform();
  const auth = useAuth();
  const setup = useSetup();
  const scope = useServerScope();
  // Setup actions run against this computer. The view waits for its first status before offering them.
  const setupProviders = useSetupProviderProps();
  const detection = useProviderDetection();
  const settings = useSettings();
  const { joinRemoteDuringSetup } = useServerSelection();
  const started = () => setup.setupLoaded() && platform.appInfo() !== null;
  const [splashShown, setSplashShown] = createSignal(true);
  const languageStep = createLanguageStep();
  const account = auth.visibleSignedInAccount;
  const languageStepShown = () => !account() && !languageStep.done();
  // A computer signed in before the wheel existed has its language already, so a later sign-out skips the wheel.
  createEffect(
    () => auth.centralAuth().status === "signed_in",
    (signedIn) => {
      if (signedIn && !languageStep.done()) languageStep.complete();
    },
  );
  // A startup mark for `dev:bench`: the first moment the app can leave the splash.
  createEffect(started, (ready) => {
    if (ready) performance.mark("openbot:app-started");
  });

  return (
    <>
      <Show when={started()}>
        <Show
          when={!languageStepShown()}
          fallback={
            <Loading fallback={<LoadingScreen />}>
              <LanguageStep
                variant={platform.appInfo()?.variant ?? "production"}
                reopened={languageStep.reopened()}
                onDone={languageStep.complete}
              />
            </Loading>
          }
        >
          <Show
            when={setup.setupState()?.completed}
            fallback={
              <Show when={scope.connection.hasContent} fallback={<WorkspaceShell account={account} />}>
                <Show when={!setup.setupReadFailed()} fallback={<SetupReadError />}>
                  <Show
                    when={setup.pendingInviteUrl().trim() && account()}
                    fallback={
                      <Loading fallback={<LoadingScreen />}>
                        <FirstRunFlow
                          {...setupProviders}
                          state={
                            setup.setupState() ?? { completed: false, preferredProvider: null, preferredModel: null }
                          }
                          platform={platform.appInfo()?.platform ?? "darwin"}
                          onSave={setup.saveSetup}
                          onAnalyticsChoice={(enabled, chosen) =>
                            settings.updateGeneralSettings(
                              { ...settings.generalSettings(), productAnalytics: enabled },
                              { analyticsChosen: chosen },
                            )
                          }
                          onProviderStepShown={detection.scanOnce}
                          logoVariant={platform.appInfo()?.variant ?? "production"}
                        />
                      </Loading>
                    }
                  >
                    <Loading fallback={<LoadingScreen />}>
                      <InitialSetup
                        {...setupProviders}
                        state={
                          setup.setupState() ?? { completed: false, preferredProvider: null, preferredModel: null }
                        }
                        platform={platform.appInfo()?.platform ?? "darwin"}
                        accountEmail={account()?.email ?? ""}
                        inviteUrl={setup.pendingInviteUrl()}
                        onSave={setup.saveSetup}
                        onPreviewInvite={setup.previewInvite}
                        onJoinRemote={joinRemoteDuringSetup}
                        onLogout={auth.logoutCentralAccount}
                      />
                    </Loading>
                  </Show>
                </Show>
              </Show>
            }
          >
            <WorkspaceShell account={account} />
          </Show>
        </Show>
      </Show>
      <WhatsNewOverlay
        ready={
          !platform.chatWindow &&
          !splashShown() &&
          (setup.setupState()?.completed === true || !scope.connection.hasContent)
        }
      />
      <QuitShortcutHint />
      <Show when={splashShown()}>
        {/* Before `appInfo` loads, the build's own mode picks the logo colour. */}
        <StartupSplash
          variant={platform.appInfo()?.variant ?? (import.meta.env.DEV ? "dev" : "production")}
          ready={started()}
          onExited={() => setSplashShown(false)}
        />
      </Show>
    </>
  );
}
