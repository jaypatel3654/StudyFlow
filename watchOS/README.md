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

## Personal Watch test before paid membership

For one-device testing before joining the paid Apple Developer Program, use `project-personal.yml` and the instructions in `PERSONAL_TEST.md`.

The personal target is named **J.K Study Test** and deliberately leaves out the widget extension / App Group so Personal Team signing is simpler. It still includes the core Watch dashboard, real Supabase sync, completion controls, exam countdown, and focus timer. The full complications and Smart Stack build remain untouched in `project.yml` for the later paid release.

## First launch

The Watch app asks for the shared workspace invite code once and stores it locally on the Watch. After a successful connection it opens directly to the dashboard on future launches. The full release target also writes the invite code and a compact dashboard snapshot into the shared App Group so the complications can refresh independently.

## Complications and Smart Stack

Two WidgetKit widgets are included in the full release target:

1. **Next Deadline** — shows the nearest assignment, today's workload, and supports an interactive completion button where the widget family allows it.
2. **Exam Countdown** — shows the closest upcoming exam and the number of days remaining.

Supported accessory families include inline, circular, rectangular, and corner layouts. These families can appear as Apple Watch complications and in the Smart Stack where supported by watchOS.

## Build validation without owning a Mac

The repository includes `.github/workflows/watchos-build.yml`. It runs on a GitHub-hosted macOS machine, installs XcodeGen, generates both the full project and the personal-test project, and performs unsigned Apple Watch Simulator builds. This catches Swift/Xcode build problems without requiring a local Mac.

## Installing on a real Apple Watch

A physical-device build has to be signed by Apple. For the personal test, Xcode can use a free **Personal Team** tied to an Apple Account; that provisioning is temporary and is for your own devices only. A paid membership is still required later for TestFlight/App Store distribution.

Because the user does not own a Mac, the source can still be validated in GitHub's cloud macOS runner, but the first installation on a physical Watch needs temporary access to a Mac running Xcode that can see the paired iPhone/Apple Watch. See `PERSONAL_TEST.md`.

For the later full release target, the account-level steps are:

1. Join the Apple Developer Program.
2. Register the App Group `group.com.jkstudymanagement.shared`.
3. Enable that App Group for both bundle IDs:
   - `com.jkstudymanagement.watch`
   - `com.jkstudymanagement.watch.widgets`
4. Create/refresh signing profiles and certificates.
5. Build/sign with Xcode or a CI signing setup.
6. Install through TestFlight or distribute through the App Store.

No Apple private key, signing certificate, or service-role database key is committed to this repository.

## Architecture

The native Watch app and WidgetKit extension call the existing Supabase security-definer RPCs using the project's publishable key plus the user's workspace invite code. Sensitive Supabase service-role credentials are not included in the Watch source.

## Remaining release polish

- Native production AppIcon asset catalog and final Watch branding
- Optional iPhone-to-Watch pairing flow so users do not have to type the invite code on the Watch
- Native watchOS notification actions
- Additional background refresh tuning after real-device testing
- App Store privacy metadata, screenshots, TestFlight, and release configuration
