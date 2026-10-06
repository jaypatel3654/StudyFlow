# J.K Study Management — Apple Watch

This folder contains the native SwiftUI watchOS app plus WidgetKit complications / Smart Stack widgets for J.K Study Management.

## Included now

- Today summary
- Next assignment card
- Exam countdown
- Today list for assignments and study tasks
- One-tap assignment completion
- One-tap study-task completion
- 25 / 45 / 60 minute focus timer
- Manual refresh
- Shared Supabase workspace connection using the same invite code as the PWA
- WidgetKit **Next Deadline** complication
- WidgetKit **Exam Countdown** complication
- Smart Stack support through accessory widgets
- One-tap **mark assignment complete** action from the rectangular widget
- Shared App Group data between the Watch app and widget extension
- Cloud simulator build validation through GitHub Actions

The Watch app reads and updates the same `assignments` and `study_tasks` data already used by J.K Study Management.

## First launch

The Watch app asks for the shared workspace invite code once and stores it locally on the Watch. After a successful connection it opens directly to the dashboard on future launches. The app also writes the invite code and a compact dashboard snapshot into the shared App Group so the complications can refresh independently.

## Complications and Smart Stack

Two WidgetKit widgets are included:

1. **Next Deadline** — shows the nearest assignment, today's workload, and supports an interactive completion button where the widget family allows it.
2. **Exam Countdown** — shows the closest upcoming exam and the number of days remaining.

Supported accessory families include inline, circular, rectangular, and corner layouts. These families can appear as Apple Watch complications and in the Smart Stack where supported by watchOS.

## Build validation without owning a Mac

The repository includes `.github/workflows/watchos-build.yml`. It runs on a GitHub-hosted macOS machine, installs XcodeGen, generates the Xcode project, and performs an unsigned Apple Watch Simulator build. This catches Swift/Xcode build problems without requiring a local Mac.

## Installing on a real Apple Watch

A real watchOS app still has to be signed by Apple before it can be installed on a physical Watch. GitHub Pages cannot install a native watchOS binary.

For device testing or distribution, the remaining account-level steps are:

1. Have an Apple Developer account/team.
2. Register the App Group `group.com.jkstudymanagement.shared` in the Apple Developer portal.
3. Enable that App Group for both bundle IDs:
   - `com.jkstudymanagement.watch`
   - `com.jkstudymanagement.watch.widgets`
4. Create/refresh signing profiles and certificates.
5. Build/sign with Xcode on a Mac or with a cloud-Mac/CI signing setup.
6. Install through Xcode/TestFlight or distribute through the App Store.

No Apple private key, signing certificate, or service-role database key is committed to this repository.

## Architecture

The native Watch app and WidgetKit extension call the existing Supabase security-definer RPCs using the project's publishable key plus the user's workspace invite code. Sensitive Supabase service-role credentials are not included in the Watch source.

## Remaining release polish

- Native production AppIcon asset catalog and final Watch branding
- Optional iPhone-to-Watch pairing flow so users do not have to type the invite code on the Watch
- Native watchOS notification actions
- Additional background refresh tuning after real-device testing
- App Store privacy metadata, screenshots, TestFlight, and release configuration
