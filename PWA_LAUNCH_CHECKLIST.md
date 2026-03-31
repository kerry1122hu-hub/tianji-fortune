# MingMe PWA Launch Checklist

## 1. Domain and security
- Deploy under an HTTPS domain.
- Confirm `app.webmanifest`, `service-worker.js`, and `offline.html` are reachable from the root path.
- Confirm `apple-touch-icon.png` and the three app icons load without 404.

## 2. Installability
- iPhone Safari:
  - Open the site.
  - Confirm the install guide card appears under the hero.
  - Use `Share -> Add to Home Screen`.
  - Confirm the app opens in standalone mode from the home screen.
- Android Chrome:
  - Open the site.
  - Confirm install CTA appears.
  - Confirm the browser install prompt can open.

## 3. Core product flow
- Open landing/home hero and confirm product positioning reads like self-reflection / decision support, not fortune-telling.
- Complete onboarding or profile creation.
- Send first AI message.
- Confirm first reply is returned.
- Send second message.
- Confirm the chat continues instead of restarting.
- Open paywall/subscription entry and confirm it renders correctly on web.

## 4. Retention and analytics
- Confirm these events reach backend `/api/ai/track-event`:
  - `landing_view`
  - `cta_start_click`
  - `install_prompt_view`
  - `install_prompt_click`
  - `pwa_installed`
  - `chat_first_message_sent`
  - `chat_first_reply_received`
  - `chat_second_message_sent`
- Confirm admin dashboard can read recent analytics events.

## 5. Offline and recovery
- Load the app once while online.
- Disconnect the network.
- Refresh a navigation route.
- Confirm `offline.html` is shown instead of a blank error page.

## 6. Release gate
- No console syntax errors in Expo web export.
- `npx expo export --platform web --output-dir .expo-web-check` succeeds.
- One iPhone test and one Android/desktop Chromium test completed.
- Backend tracking route deployed to production.
