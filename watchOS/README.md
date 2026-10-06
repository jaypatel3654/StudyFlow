# J.K Study Management — Apple Watch prototype

This folder contains the native SwiftUI watchOS prototype for Phase 2 Apple Watch support.

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

The Watch app reads and updates the same `assignments` and `study_tasks` data already used by J.K Study Management.

## First launch

The Watch app asks for the shared workspace invite code once and stores it locally on the Watch. After a successful connection it opens directly to the dashboard on future launches.

## Build

A native watchOS app must be compiled and signed with Xcode. Because the current main app is a PWA, GitHub Pages cannot deploy a native watchOS binary.

On a Mac or cloud Mac with Xcode:

1. Install XcodeGen if desired.
2. In this `watchOS` directory run `xcodegen generate`.
3. Open `JKStudyWatch.xcodeproj` in Xcode.
4. Select your Apple Developer Team under Signing & Capabilities.
5. Add an AppIcon asset for production/App Store builds.
6. Run on an Apple Watch simulator or a paired Apple Watch.

You can also create a new watchOS App project manually in Xcode and add the Swift files in this folder.

## Architecture

The prototype is independent of the PWA. It calls the existing Supabase security-definer RPCs using the project publishable key plus the user's workspace invite code. No service-role key is included in the Watch app.

## Next production steps

- Add native AppIcon assets and branding.
- Add Keychain storage for the workspace code instead of UserDefaults.
- Add a pairing flow so users do not need to type the invite code on the Watch.
- Add complications / Smart Stack widgets for next deadline.
- Add native watchOS notification actions.
- Add background refresh where appropriate.
- Add App Store signing, privacy metadata, and release configuration.
